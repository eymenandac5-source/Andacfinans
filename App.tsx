import { useCallback, useEffect, useMemo, useState } from 'react';
import { AddHoldingModal } from './components/AddHoldingModal';
import { AuthGateModal, type AuthModalMode } from './components/AuthGateModal';
import { LayoutShell } from './components/LayoutShell';
import { LegalModal } from './components/LegalModal';
import { apiRequest, setStoredSessionToken } from './lib/api';
import { CryptoPage } from './pages/CryptoPage';
import { DashboardPage } from './pages/DashboardPage';
import { DividendsPage } from './pages/DividendsPage';
import { FundsPage } from './pages/FundsPage';
import { NewsPage } from './pages/NewsPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';
import type {
  AssetType,
  AuthState,
  CryptoItem,
  FundItem,
  MarketSnapshot,
  NewsArticle,
  PageId,
  PortfolioHolding,
  PortfolioSummary,
  PortfolioTransaction,
  StockItem,
  UserProfile,
  UserSettings,
} from './types/finance';

const GUEST_DISMISSED_KEY = 'andac_guest_dismissed';

export default function App() {
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [funds, setFunds] = useState<FundItem[]>([]);
  const [crypto, setCrypto] = useState<CryptoItem[]>([]);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [selectedNewsArticle, setSelectedNewsArticle] = useState<NewsArticle | null>(null);

  const [favorites, setFavorites] = useState<{ assetType: AssetType; assetId: string }[]>([]);
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [transactions, setTransactions] = useState<PortfolioTransaction[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('welcome');
  const [authModalToken, setAuthModalToken] = useState('');
  const [legalDoc, setLegalDoc] = useState<'terms' | 'privacy' | null>(null);

  const [addHoldingOpen, setAddHoldingOpen] = useState(false);
  const [preselectedAsset, setPreselectedAsset] = useState<{ assetType: AssetType; assetId: string } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((curr) => (curr === msg ? null : curr));
    }, 3600);
  }, []);

  const loadUserData = useCallback(async () => {
    try {
      const [favRes, portRes] = await Promise.all([
        apiRequest<{ favorites: { assetType: AssetType; assetId: string }[] }>('/api/favorites'),
        apiRequest<{
          holdings: PortfolioHolding[];
          transactions: PortfolioTransaction[];
          summary: PortfolioSummary;
        }>('/api/portfolio'),
      ]);
      setFavorites(favRes.favorites || []);
      setHoldings(portRes.holdings || []);
      setTransactions(portRes.transactions || []);
      setPortfolioSummary(portRes.summary || null);
    } catch {
      // Ignore if unauthenticated
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      setLoading(true);
      setLoadError(null);
      try {
        const [marketRes, authRes] = await Promise.all([
          apiRequest<{
            snapshot: MarketSnapshot;
            funds: FundItem[];
            crypto: CryptoItem[];
            stocks: StockItem[];
            news: NewsArticle[];
          }>('/api/markets/overview'),
          apiRequest<AuthState>('/api/auth/me'),
        ]);

        if (!mounted) return;
        setSnapshot(marketRes.snapshot);
        setFunds(marketRes.funds);
        setCrypto(marketRes.crypto);
        setStocks(marketRes.stocks);
        setNews(marketRes.news);

        if (authRes.authenticated && authRes.user) {
          setUser(authRes.user);
          setSettings(authRes.settings);
          await loadUserData();
        } else {
          setUser(null);
          setSettings(null);
        }

        // Check URL params for verification or password reset tokens
        const params = new URLSearchParams(window.location.search);
        const verifyToken = params.get('verifyToken');
        const resetToken = params.get('resetToken');
        if (verifyToken) {
          setAuthModalMode('verify');
          setAuthModalToken(verifyToken);
          setAuthModalOpen(true);
          window.history.replaceState({}, '', window.location.pathname);
        } else if (resetToken) {
          setAuthModalMode('reset');
          setAuthModalToken(resetToken);
          setAuthModalOpen(true);
          window.history.replaceState({}, '', window.location.pathname);
        } else if (!authRes.authenticated) {
          const dismissed = sessionStorage.getItem(GUEST_DISMISSED_KEY) === '1';
          if (!dismissed) {
            setAuthModalMode('welcome');
            setAuthModalOpen(true);
          }
        }
      } catch (err) {
        if (mounted) {
          setLoadError(err instanceof Error ? err.message : 'Veriler yüklenirken hata oluştu.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      mounted = false;
    };
  }, [loadUserData]);

  const favoriteIds = useMemo(() => new Set(favorites.map((f) => f.assetId)), [favorites]);

  function openAuth(mode: AuthModalMode = 'welcome') {
    setAuthModalMode(mode);
    setAuthModalToken('');
    setAuthModalOpen(true);
  }

  function handleCloseAsGuest() {
    try {
      sessionStorage.setItem(GUEST_DISMISSED_KEY, '1');
    } catch {
      // Ignore storage error
    }
    setAuthModalOpen(false);
    setActivePage('dashboard');
  }

  async function handleAuthSuccess(loggedUser: UserProfile, userSettings: UserSettings | null) {
    setUser(loggedUser);
    if (userSettings) setSettings(userSettings);
    setAuthModalOpen(false);
    await loadUserData();
    showToast(`Hoş geldiniz, ${loggedUser.fullName}.`);
  }

  async function handleToggleFavorite(assetType: AssetType, assetId: string) {
    if (!user) {
      showToast('Favori listesi oluşturmak için giriş yapmanız gerekiyor.');
      openAuth('login');
      return;
    }
    try {
      const res = await apiRequest<{ ok: boolean; isFavorite: boolean }>('/api/favorites/toggle', {
        method: 'POST',
        body: JSON.stringify({ assetType, assetId }),
      });
      setFavorites((prev) => {
        if (res.isFavorite) return [...prev, { assetType, assetId }];
        return prev.filter((f) => !(f.assetType === assetType && f.assetId === assetId));
      });
      showToast(res.isFavorite ? 'Favorilere eklendi.' : 'Favorilerden çıkarıldı.');
    } catch {
      showToast('Favori güncellenemedi.');
    }
  }

  function handleRequestAddAsset(assetType?: AssetType, assetId?: string) {
    if (!user) {
      showToast('Portföye varlık eklemek için hesap girişi gereklidir.');
      openAuth('login');
      return;
    }
    if (assetType && assetId) {
      setPreselectedAsset({ assetType, assetId });
    } else {
      setPreselectedAsset(null);
    }
    setAddHoldingOpen(true);
  }

  async function handleRemoveHolding(holdingId: string) {
    try {
      const res = await apiRequest<{
        holdings: PortfolioHolding[];
        transactions: PortfolioTransaction[];
        summary: PortfolioSummary;
      }>(`/api/portfolio/holdings/${encodeURIComponent(holdingId)}`, {
        method: 'DELETE',
      });
      setHoldings(res.holdings);
      setTransactions(res.transactions);
      setPortfolioSummary(res.summary);
      showToast('Varlık portföyden kaldırıldı.');
    } catch {
      showToast('Varlık kaldırılırken bir hata oluştu.');
    }
  }

  function handleLoggedOut() {
    setStoredSessionToken(null);
    setUser(null);
    setSettings(null);
    setFavorites([]);
    setHoldings([]);
    setTransactions([]);
    setPortfolioSummary(null);
    setActivePage('dashboard');
    openAuth('welcome');
    showToast('Oturumunuz güvenli biçimde kapatıldı.');
  }

  function handleAccountDeleted() {
    setStoredSessionToken(null);
    try {
      sessionStorage.removeItem(GUEST_DISMISSED_KEY);
    } catch {
      // Ignore
    }
    setUser(null);
    setSettings(null);
    setFavorites([]);
    setHoldings([]);
    setTransactions([]);
    setPortfolioSummary(null);
    setActivePage('dashboard');
    openAuth('login');
    showToast('Hesabınız ve kişisel verileriniz kalıcı olarak silindi.');
  }

  function handleNavigate(page: PageId) {
    if (page !== 'news') setSelectedNewsArticle(null);
    setActivePage(page);
  }

  return (
    <>
      <LayoutShell
        activePage={activePage}
        onNavigate={handleNavigate}
        user={user}
        snapshot={snapshot}
        onOpenAuth={(m) => openAuth(m || 'welcome')}
        onQuickAddAsset={() => handleRequestAddAsset()}
      >
        {loading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-64 rounded-2xl bg-[#1B1F18]" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-48 rounded-2xl bg-[#1B1F18]" />
              <div className="h-48 rounded-2xl bg-[#1B1F18]" />
            </div>
          </div>
        ) : loadError || !snapshot ? (
          <div className="bg-[#1B1F18] border border-[#FF5B5B]/30 rounded-2xl p-8 text-center space-y-3">
            <h2 className="text-lg font-display font-bold text-white">Bağlantı Sorunu</h2>
            <p className="text-sm text-[#A5A99E]">{loadError || 'Piyasa verilerine ulaşılamadı.'}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-[#B7F000] text-[#10120D] text-xs font-semibold cursor-pointer"
            >
              Yeniden Dene
            </button>
          </div>
        ) : (
          <>
            {activePage === 'dashboard' && (
              <DashboardPage
                user={user}
                snapshot={snapshot}
                funds={funds}
                crypto={crypto}
                stocks={stocks}
                news={news}
                favorites={favorites}
                portfolioSummary={portfolioSummary}
                holdings={holdings}
                transactions={transactions}
                onNavigate={handleNavigate}
                onOpenAuth={(m) => openAuth(m || 'welcome')}
                onQuickAddAsset={() => handleRequestAddAsset()}
                onSelectNews={(article) => {
                  setSelectedNewsArticle(article);
                  setActivePage('news');
                }}
              />
            )}

            {activePage === 'funds' && (
              <FundsPage
                funds={funds}
                favoriteIds={favoriteIds}
                onToggleFavorite={handleToggleFavorite}
                onAddToPortfolio={handleRequestAddAsset}
              />
            )}

            {activePage === 'crypto' && (
              <CryptoPage
                crypto={crypto}
                cryptoNews={news.filter((n) => n.category === 'Kripto Para')}
                favoriteIds={favoriteIds}
                onToggleFavorite={handleToggleFavorite}
                onAddToPortfolio={handleRequestAddAsset}
                onSelectNews={(article) => {
                  setSelectedNewsArticle(article);
                  setActivePage('news');
                }}
              />
            )}

            {activePage === 'dividends' && (
              <DividendsPage
                stocks={stocks}
                favoriteIds={favoriteIds}
                onToggleFavorite={handleToggleFavorite}
                onAddToPortfolio={handleRequestAddAsset}
              />
            )}

            {activePage === 'news' && (
              <NewsPage
                news={news}
                selectedArticle={selectedNewsArticle}
                onSelectArticle={setSelectedNewsArticle}
              />
            )}

            {activePage === 'portfolio' && (
              <PortfolioPage
                user={user}
                holdings={holdings}
                transactions={transactions}
                summary={portfolioSummary}
                onOpenAuth={(m) => openAuth(m || 'login')}
                onOpenAddHolding={() => handleRequestAddAsset()}
                onRemoveHolding={handleRemoveHolding}
              />
            )}

            {activePage === 'profile' && (
              <ProfileSettingsPage
                user={user}
                settings={settings}
                onOpenAuth={(m) => openAuth(m || 'login')}
                onUserUpdated={(updated) => setUser(updated)}
                onSettingsUpdated={(updated) => setSettings(updated)}
                onLoggedOut={handleLoggedOut}
                onAccountDeleted={handleAccountDeleted}
                onOpenLegal={(doc) => setLegalDoc(doc)}
              />
            )}
          </>
        )}
      </LayoutShell>

      <AuthGateModal
        open={authModalOpen}
        initialMode={authModalMode}
        initialToken={authModalToken}
        userEmailForVerify={user?.email || ''}
        onCloseAsGuest={handleCloseAsGuest}
        onAuthSuccess={handleAuthSuccess}
        onOpenLegal={(doc) => setLegalDoc(doc)}
      />

      <AddHoldingModal
        open={addHoldingOpen}
        funds={funds}
        crypto={crypto}
        stocks={stocks}
        preselected={preselectedAsset}
        onClose={() => setAddHoldingOpen(false)}
        onSuccess={(payload) => {
          setHoldings(payload.holdings);
          setTransactions(payload.transactions);
          setPortfolioSummary(payload.summary);
          showToast('Varlık portföyünüze eklendi.');
        }}
      />

      <LegalModal docType={legalDoc} onClose={() => setLegalDoc(null)} />

      {toastMsg && (
        <div
          role="status"
          className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 bg-[#1B1F18] border border-[#B7F000]/40 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium"
        >
          {toastMsg}
        </div>
      )}
    </>
  );
}
