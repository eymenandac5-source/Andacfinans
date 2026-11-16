import type { ReactNode } from 'react';
import {
  BarChart3,
  Bitcoin,
  Briefcase,
  Coins,
  LayoutDashboard,
  Newspaper,
  Settings,
  ShieldAlert,
  UserCheck,
  UserRound,
} from 'lucide-react';
import type { MarketSnapshot, PageId, UserProfile } from '../types/finance';
import { formatNumber, formatPct } from '../utils/format';
import { BrandMark } from './BrandMark';

interface LayoutShellProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  user: UserProfile | null;
  snapshot: MarketSnapshot | null;
  onOpenAuth: (mode?: 'welcome' | 'login' | 'register' | 'verify') => void;
  onQuickAddAsset: () => void;
  children: ReactNode;
}

const NAV_ITEMS: { id: PageId; label: string; shortLabel: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Ana Sayfa', shortLabel: 'Özet', icon: LayoutDashboard },
  { id: 'funds', label: 'Fonlar', shortLabel: 'Fonlar', icon: BarChart3 },
  { id: 'crypto', label: 'Kripto', shortLabel: 'Kripto', icon: Bitcoin },
  { id: 'dividends', label: 'Temettü', shortLabel: 'Temettü', icon: Coins },
  { id: 'news', label: 'Haberler', shortLabel: 'Haber', icon: Newspaper },
  { id: 'portfolio', label: 'Portföy', shortLabel: 'Portföy', icon: Briefcase },
  { id: 'profile', label: 'Profil ve Ayarlar', shortLabel: 'Profil', icon: Settings },
];

const PAGE_TITLES: Record<PageId, string> = {
  dashboard: 'Piyasa ve Portföy Özeti',
  funds: 'Yatırım Fonları',
  crypto: 'Kripto Para Piyasaları',
  dividends: 'Borsa İstanbul ve Temettü Analizi',
  news: 'Finans ve Ekonomi Haberleri',
  portfolio: 'Kişisel Portföy Takibi',
  profile: 'Profil ve Hesap Ayarları',
};

export function LayoutShell({
  activePage,
  onNavigate,
  user,
  snapshot,
  onOpenAuth,
  onQuickAddAsset,
  children,
}: LayoutShellProps) {
  return (
    <div className="min-h-screen bg-[#10120D] text-white flex flex-col md:flex-row">
      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-[#10120D] border-r border-white/[0.08] z-30">
        <div className="px-6 py-6 border-b border-white/[0.08]">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="text-left cursor-pointer"
          >
            <BrandMark showSlogan />
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto" aria-label="Ana menü">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#B7F000] text-[#10120D] font-semibold'
                    : 'text-[#A5A99E] hover:text-white hover:bg-[#1B1F18]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/[0.08]">
          {user ? (
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#1B1F18] hover:bg-[#23281f] transition-colors text-left cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-[#B7F000]/15 text-[#B7F000] flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white truncate">{user.fullName}</div>
                <div className="text-[11px] text-[#A5A99E] truncate">{user.email}</div>
              </div>
            </button>
          ) : (
            <div className="p-3.5 rounded-xl bg-[#1B1F18] space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/[0.07] text-[#A5A99E] flex items-center justify-center shrink-0">
                  <UserRound className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">Misafir Oturumu</div>
                  <div className="text-[11px] text-[#A5A99E]">Salt okunur inceleme</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="w-full py-2 px-3 rounded-lg bg-[#B7F000] text-[#10120D] text-xs font-semibold hover:brightness-105 transition-all cursor-pointer"
              >
                Giriş Yap veya Kayıt Ol
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Top Bar (Clean 3-zone layout) */}
        <header className="sticky top-0 z-20 bg-[#10120D]/90 backdrop-blur-md border-b border-white/[0.08]">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
            <div className="flex items-center gap-3 min-w-0">
              <div className="md:hidden">
                <BrandMark compact />
              </div>
              <h1 className="text-base sm:text-lg font-display font-bold text-white truncate">
                {PAGE_TITLES[activePage]}
              </h1>
            </div>

            {snapshot && (
              <div className="hidden lg:flex items-center gap-6 text-xs text-[#A5A99E] font-mono-num whitespace-nowrap">
                <div>
                  <span className="text-[#A5A99E] mr-1.5">BIST 100</span>
                  <span className="text-white font-semibold">{formatNumber(snapshot.bist100.value, 0)}</span>
                  <span
                    className="ml-1.5"
                    style={{ color: snapshot.bist100.changePct >= 0 ? '#B7F000' : '#FF5B5B' }}
                  >
                    {formatPct(snapshot.bist100.changePct)}
                  </span>
                </div>
                <span aria-hidden="true" className="text-white/15">
                  /
                </span>
                <div>
                  <span className="text-[#A5A99E] mr-1.5">USD/TRY</span>
                  <span className="text-white font-semibold">{formatNumber(snapshot.usdTryRate, 2)}</span>
                </div>
                <span aria-hidden="true" className="text-white/15">
                  /
                </span>
                <div>
                  <span className="text-[#A5A99E] mr-1.5">DEMO Veri</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 shrink-0">
              {user ? (
                <button
                  type="button"
                  onClick={onQuickAddAsset}
                  className="px-4 py-2 rounded-xl bg-[#B7F000] text-[#10120D] text-xs sm:text-sm font-semibold whitespace-nowrap hover:brightness-105 transition-all cursor-pointer"
                >
                  + Varlık Ekle
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenAuth('welcome')}
                  className="px-4 py-2 rounded-xl bg-[#B7F000] text-[#10120D] text-xs sm:text-sm font-semibold whitespace-nowrap hover:brightness-105 transition-all cursor-pointer"
                >
                  Hesap Aç / Giriş
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Unverified Email Notice */}
        {user && !user.emailVerified && (
          <div className="bg-[#1B1F18] border-b border-[#B7F000]/25">
            <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-[#A5A99E]">
                <ShieldAlert className="w-4 h-4 text-[#B7F000] shrink-0" />
                <span>
                  Hesap güvenliğiniz için <strong className="text-white">{user.email}</strong> adresinizi
                  doğrulamanız önerilir.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onOpenAuth('verify')}
                className="text-[#B7F000] font-semibold hover:underline whitespace-nowrap cursor-pointer"
              >
                E-postayı Doğrula →
              </button>
            </div>
          </div>
        )}

        {/* Page Viewport */}
        <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#10120D]/95 backdrop-blur-md border-t border-white/[0.08] h-16 grid grid-cols-7 px-1"
        aria-label="Mobil alt menü"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors cursor-pointer ${
                active ? 'text-[#B7F000]' : 'text-[#A5A99E]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate max-w-full px-0.5">{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
