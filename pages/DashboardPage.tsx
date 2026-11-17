import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronRight, Lock, Plus, Star } from 'lucide-react';
import { AreaPerformanceChart } from '../components/Charts';
import { NEWS_IMAGE_MAP } from '../data/media';
import type {
  AssetType,
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
} from '../types/finance';
import { formatDateTr, formatNumber, formatPct, formatTry, formatUsd } from '../utils/format';

interface DashboardPageProps {
  user: UserProfile | null;
  snapshot: MarketSnapshot;
  funds: FundItem[];
  crypto: CryptoItem[];
  stocks: StockItem[];
  news: NewsArticle[];
  favorites: { assetType: AssetType; assetId: string }[];
  portfolioSummary: PortfolioSummary | null;
  holdings: PortfolioHolding[];
  transactions: PortfolioTransaction[];
  onNavigate: (page: PageId) => void;
  onOpenAuth: (mode?: 'welcome' | 'login' | 'register') => void;
  onQuickAddAsset: () => void;
  onSelectNews: (article: NewsArticle) => void;
}

export function DashboardPage({
  user,
  snapshot,
  funds,
  crypto,
  stocks,
  news,
  favorites,
  portfolioSummary,
  holdings,
  transactions,
  onNavigate,
  onOpenAuth,
  onQuickAddAsset,
  onSelectNews,
}: DashboardPageProps) {
  const [timeframe, setTimeframe] = useState<'1G' | '1H' | '1A' | '1Y'>('1A');

  const isGuest = !user;
  const hasRealPortfolio = Boolean(user && portfolioSummary && holdings.length > 0);

  const heroTotalValue = hasRealPortfolio
    ? portfolioSummary!.totalValueTry
    : isGuest
    ? 1148420.5
    : 0;

  const heroDailyPct = hasRealPortfolio ? portfolioSummary!.dailyChangePct : isGuest ? 1.64 : 0;
  const heroMonthlyPct = hasRealPortfolio ? portfolioSummary!.monthlyChangePct : isGuest ? 7.82 : 0;

  const rawSeries = hasRealPortfolio
    ? portfolioSummary!.performanceSeries
    : snapshot.demoPortfolioSeries;

  const displayedSeries =
    timeframe === '1G'
      ? rawSeries.slice(-6)
      : timeframe === '1H'
      ? rawSeries.slice(-10)
      : rawSeries;

  const allocationItems = hasRealPortfolio
    ? portfolioSummary!.allocation
    : [
        { assetType: 'fund' as AssetType, label: 'Yatırım Fonları', valueTry: 516789, percentage: 45 },
        { assetType: 'stock' as AssetType, label: 'BIST Hisse & Temettü', valueTry: 401947, percentage: 35 },
        { assetType: 'crypto' as AssetType, label: 'Kripto Varlıklar', valueTry: 229684, percentage: 20 },
      ];

  const trackedList =
    user && favorites.length > 0
      ? favorites
          .map((fav) => {
            if (fav.assetType === 'fund') {
              const f = funds.find((x) => x.id === fav.assetId);
              return f
                ? { id: f.id, code: f.code, name: f.name, type: 'Fon', price: formatTry(f.price, 4), change: f.dailyChangePct, page: 'funds' as PageId }
                : null;
            }
            if (fav.assetType === 'crypto') {
              const c = crypto.find((x) => x.id === fav.assetId);
              return c
                ? { id: c.id, code: c.symbol, name: c.name, type: 'Kripto', price: formatUsd(c.priceUsd), change: c.change24hPct, page: 'crypto' as PageId }
                : null;
            }
            const s = stocks.find((x) => x.id === fav.assetId);
            return s
              ? { id: s.id, code: s.ticker, name: s.name, type: 'BIST', price: formatTry(s.priceTry), change: s.dailyChangePct, page: 'dividends' as PageId }
              : null;
          })
          .filter(Boolean)
      : [
          { id: 'fund-aft', code: 'AFT', name: 'Ak Portföy Yeni Teknolojiler', type: 'Fon', price: formatTry(funds[0]?.price || 0, 4), change: funds[0]?.dailyChangePct || 0, page: 'funds' as PageId },
          { id: 'stock-tuprs', code: 'TUPRS', name: 'Tüpraş Rafinerileri', type: 'BIST', price: formatTry(stocks[0]?.priceTry || 0), change: stocks[0]?.dailyChangePct || 0, page: 'dividends' as PageId },
          { id: 'crypto-btc', code: 'BTC', name: 'Bitcoin', type: 'Kripto', price: formatUsd(crypto[0]?.priceUsd || 0), change: crypto[0]?.change24hPct || 0, page: 'crypto' as PageId },
          { id: 'stock-froto', code: 'FROTO', name: 'Ford Otosan', type: 'BIST', price: formatTry(stocks[1]?.priceTry || 0), change: stocks[1]?.dailyChangePct || 0, page: 'dividends' as PageId },
        ];

  const gainers = snapshot.topMovers.filter((m) => m.changePct >= 0).slice(0, 4);
  const losers = snapshot.topMovers.filter((m) => m.changePct < 0).slice(0, 4);

  const demoTransactions = [
    { id: 'demo-1', symbol: 'TUPRS', txType: 'dividend', amount: '+₺5.375,00', date: '2026-10-01', label: 'Temettü Ödemesi (Örnek)' },
    { id: 'demo-2', symbol: 'AFT', txType: 'buy', amount: '₺42.500,00', date: '2026-11-04', label: 'Fon Alışı (Örnek)' },
    { id: 'demo-3', symbol: 'BTC', txType: 'buy', amount: '₺85.000,00', date: '2026-11-11', label: 'Kripto Takip (Örnek)' },
  ];

  return (
    <div className="space-y-8">
      {/* Guest or Demo Transparency Notice */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#1B1F18] border border-white/[0.08] text-xs text-[#A5A99E]">
        <span>
          {isGuest
            ? 'Misafir Görünümü · Portföy alanı örnek (DEMO) dağılımı göstermektedir. Gerçek yatırım hesabı değildir.'
            : snapshot.dataSourceNotice}
        </span>
        {isGuest && (
          <button
            type="button"
            onClick={() => onOpenAuth('register')}
            className="text-[#B7F000] font-semibold hover:underline whitespace-nowrap cursor-pointer"
          >
            Kendi Portföyünü Oluştur →
          </button>
        )}
      </div>

      {/* Main Portfolio Hero + Allocation Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs text-[#A5A99E]">
                {isGuest
                  ? 'Örnek Portföy Değeri · DEMO Gösterim'
                  : hasRealPortfolio
                  ? `${user.fullName} · Toplam Takip Edilen Portföy`
                  : `${user.fullName} · Portföyünüz Henüz Boş`}
              </div>
              <div className="text-3xl sm:text-4xl font-display font-bold font-mono-num text-white mt-2 tracking-tight">
                {formatTry(heroTotalValue)}
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-2.5 text-sm font-mono-num">
                <span
                  className="inline-flex items-center gap-1 font-semibold"
                  style={{ color: heroDailyPct >= 0 ? '#B7F000' : '#FF5B5B' }}
                >
                  {heroDailyPct >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  Günlük {formatPct(heroDailyPct)}
                </span>
                <span className="text-white/20" aria-hidden="true">
                  ·
                </span>
                <span
                  className="font-medium"
                  style={{ color: heroMonthlyPct >= 0 ? '#B7F000' : '#FF5B5B' }}
                >
                  Aylık {formatPct(heroMonthlyPct)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#10120D] rounded-xl border border-white/[0.08]">
              {(['1G', '1H', '1A', '1Y'] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    timeframe === tf ? 'bg-[#B7F000] text-[#10120D]' : 'text-[#A5A99E] hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            {user && !hasRealPortfolio ? (
              <div className="h-[220px] rounded-2xl bg-[#10120D]/60 border border-white/[0.06] flex flex-col items-center justify-center text-center p-6">
                <p className="text-sm text-[#A5A99E] max-w-md">
                  Henüz portföyünüze varlık eklemediniz. Fon, kripto veya BIST hisse ekleyerek performans
                  grafiğinizi canlı oluşturabilirsiniz.
                </p>
                <button
                  type="button"
                  onClick={onQuickAddAsset}
                  className="mt-4 px-4 py-2.5 rounded-xl bg-[#B7F000] text-[#10120D] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>İlk Varlığı Ekle</span>
                </button>
              </div>
            ) : (
              <AreaPerformanceChart
                data={displayedSeries}
                height={220}
                positive={heroDailyPct >= 0}
                valueFormatter={(v) => formatTry(v)}
              />
            )}
          </div>
        </div>

        {/* Asset Allocation & Macro Summary */}
        <div className="lg:col-span-4 bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-6 flex flex-col justify-between gap-6">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-display font-bold text-white">Varlık Dağılımı</h2>
              <span className="text-xs text-[#A5A99E]">{isGuest ? 'DEMO' : 'Güncel'}</span>
            </div>

            {/* Segmented allocation bar */}
            <div className="h-3 w-full rounded-full bg-[#10120D] overflow-hidden flex mt-4">
              {allocationItems.map((item, idx) => {
                const colors = ['#B7F000', '#FFFFFF', '#5A6650'];
                return (
                  <div
                    key={item.assetType}
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: colors[idx % colors.length],
                    }}
                    className="h-full transition-all"
                    title={`${item.label}: %${item.percentage}`}
                  />
                );
              })}
            </div>

            <div className="mt-5 space-y-3.5">
              {allocationItems.map((item, idx) => {
                const colors = ['#B7F000', '#FFFFFF', '#5A6650'];
                return (
                  <div key={item.assetType} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: colors[idx % colors.length] }}
                      />
                      <span className="text-[#A5A99E] truncate">{item.label}</span>
                    </div>
                    <div className="text-right font-mono-num shrink-0">
                      <span className="text-white font-semibold">%{item.percentage}</span>
                      <span className="text-xs text-[#A5A99E] ml-2">{formatTry(item.valueTry, 0)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.08] grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-[#A5A99E]">Gram Altın (DEMO)</div>
              <div className="text-base font-bold font-mono-num text-white mt-1">
                {formatTry(snapshot.gramGoldTry.value)}
              </div>
              <div className="text-xs font-mono-num text-[#B7F000]">
                {formatPct(snapshot.gramGoldTry.changePct)}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#A5A99E]">EUR / TRY</div>
              <div className="text-base font-bold font-mono-num text-white mt-1">
                {formatNumber(snapshot.eurTryRate, 2)} ₺
              </div>
              <div className="text-xs font-mono-num text-[#A5A99E]">
                USD {formatNumber(snapshot.usdTryRate, 2)} ₺
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tracked Investments & Top Movers */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tracked Investments */}
        <div className="lg:col-span-6 bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-display font-bold text-white flex items-center gap-2">
              <Star className="w-4 h-4 text-[#B7F000]" />
              <span>{user && favorites.length > 0 ? 'Favori Yatırımlarınız' : 'Takip Edilen Varlıklar'}</span>
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('funds')}
              className="text-xs font-medium text-[#B7F000] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Piyasalar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {trackedList.map((item) =>
              item ? (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.page)}
                  className="w-full py-3.5 flex items-center justify-between gap-4 hover:bg-white/[0.02] -mx-2 px-2 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-sm text-white">{item.code}</span>
                      <span className="text-xs text-[#A5A99E]">· {item.type}</span>
                    </div>
                    <div className="text-xs text-[#A5A99E] truncate mt-0.5">{item.name}</div>
                  </div>
                  <div className="text-right font-mono-num shrink-0">
                    <div className="text-sm font-semibold text-white">{item.price}</div>
                    <div
                      className="text-xs font-semibold"
                      style={{ color: item.change >= 0 ? '#B7F000' : '#FF5B5B' }}
                    >
                      {formatPct(item.change)}
                    </div>
                  </div>
                </button>
              ) : null
            )}
          </div>
        </div>

        {/* Top Gainers & Losers */}
        <div className="lg:col-span-6 bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-6">
          <h2 className="text-base font-display font-bold text-white mb-4">En Çok Yükselen ve Düşenler</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="text-xs font-medium text-[#B7F000] pb-2 border-b border-white/[0.08]">
                Yükselen Varlıklar
              </div>
              <div className="divide-y divide-white/[0.06] mt-1">
                {gainers.map((m) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <div className="font-semibold text-white">{m.symbol}</div>
                      <div className="text-xs text-[#A5A99E] truncate">{m.name}</div>
                    </div>
                    <div className="text-right font-mono-num shrink-0">
                      <div className="text-xs text-white">{m.priceLabel}</div>
                      <div className="text-xs font-semibold text-[#B7F000]">{formatPct(m.changePct)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-[#FF5B5B] pb-2 border-b border-white/[0.08]">
                Düşen Varlıklar
              </div>
              <div className="divide-y divide-white/[0.06] mt-1">
                {losers.map((m) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <div className="font-semibold text-white">{m.symbol}</div>
                      <div className="text-xs text-[#A5A99E] truncate">{m.name}</div>
                    </div>
                    <div className="text-right font-mono-num shrink-0">
                      <div className="text-xs text-white">{m.priceLabel}</div>
                      <div className="text-xs font-semibold text-[#FF5B5B]">{formatPct(m.changePct)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Transactions & Featured News */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-5 bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-display font-bold text-white">Son İşlemler</h2>
            <button
              type="button"
              onClick={() => onNavigate('portfolio')}
              className="text-xs text-[#B7F000] hover:underline cursor-pointer"
            >
              Portföye Git →
            </button>
          </div>

          {isGuest ? (
            <div className="space-y-3">
              <div className="divide-y divide-white/[0.06]">
                {demoTransactions.map((tx) => (
                  <div key={tx.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                    <div>
                      <div className="font-semibold text-white">{tx.symbol}</div>
                      <div className="text-xs text-[#A5A99E]">
                        {tx.label} · {formatDateTr(tx.date)}
                      </div>
                    </div>
                    <div className="font-mono-num font-semibold text-white">{tx.amount}</div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="w-full py-2.5 px-4 rounded-xl bg-[#10120D] border border-white/[0.1] text-xs font-medium text-[#A5A99E] hover:text-white flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-[#B7F000]" />
                <span>Kendi işlem geçmişiniz için giriş yapın</span>
              </button>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#A5A99E]">
              Henüz portföy işlemi kaydınız bulunmuyor.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                  <div>
                    <div className="font-semibold text-white">
                      {tx.symbol}{' '}
                      <span className="text-xs font-normal text-[#A5A99E]">
                        · {tx.txType === 'buy' ? 'Alış' : tx.txType === 'sell' ? 'Satış' : 'Temettü'}
                      </span>
                    </div>
                    <div className="text-xs text-[#A5A99E]">
                      {tx.quantity} adet · {formatDateTr(tx.txDate)}
                    </div>
                  </div>
                  <div className="font-mono-num font-semibold text-white">{formatTry(tx.totalAmountTry)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Featured Market News */}
        <div className="lg:col-span-7 bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-display font-bold text-white">Öne Çıkan Piyasa Haberleri</h2>
            <button
              type="button"
              onClick={() => onNavigate('news')}
              className="text-xs text-[#B7F000] hover:underline cursor-pointer"
            >
              Tüm Haberler →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {news.slice(0, 4).map((article) => (
              <button
                key={article.id}
                type="button"
                onClick={() => onSelectNews(article)}
                className="group text-left rounded-xl overflow-hidden bg-[#10120D] border border-white/[0.07] hover:border-[#B7F000]/40 transition-colors flex flex-col cursor-pointer"
              >
                <div className="aspect-[16/9] w-full overflow-hidden bg-[#1B1F18]">
                  <img
                    src={NEWS_IMAGE_MAP[article.imageKey]}
                    alt={article.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] text-[#A5A99E]">
                      {article.category} · {formatDateTr(article.publishedAt)}
                    </div>
                    <h3 className="text-sm font-display font-semibold text-white mt-1.5 line-clamp-2 group-hover:text-[#B7F000] transition-colors">
                      {article.title}
                    </h3>
                  </div>
                  <div className="text-xs text-[#A5A99E] mt-3">{article.source}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
