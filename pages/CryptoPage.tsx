import { useMemo, useState } from 'react';
import { Plus, Search, Star } from 'lucide-react';
import { AreaPerformanceChart, SparklineChart } from '../components/Charts';
import { NEWS_IMAGE_MAP } from '../data/media';
import type { AssetType, CryptoItem, NewsArticle } from '../types/finance';
import { formatCompactUsdBillion, formatPct, formatTry, formatUsd } from '../utils/format';

interface CryptoPageProps {
  crypto: CryptoItem[];
  cryptoNews: NewsArticle[];
  favoriteIds: Set<string>;
  onToggleFavorite: (assetType: AssetType, assetId: string) => void;
  onAddToPortfolio: (assetType: AssetType, assetId: string) => void;
  onSelectNews: (article: NewsArticle) => void;
}

export function CryptoPage({
  crypto,
  cryptoNews,
  favoriteIds,
  onToggleFavorite,
  onAddToPortfolio,
  onSelectNews,
}: CryptoPageProps) {
  const [search, setSearch] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'TRY'>('USD');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<CryptoItem | null>(crypto[0] || null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return crypto.filter((c) => {
      if (onlyFavorites && !favoriteIds.has(c.id)) return false;
      if (!q) return true;
      return c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
    });
  }, [crypto, search, onlyFavorites, favoriteIds]);

  const totalMcap = crypto.reduce((sum, c) => sum + c.marketCapUsdBillion, 0);
  const totalVol = crypto.reduce((sum, c) => sum + c.volume24hUsdMillion, 0);

  return (
    <div className="space-y-6">
      {/* DEMO Market Banner + KPIs */}
      <div className="bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-display font-bold text-white">Kripto Para Piyasası</h2>
            <span className="text-xs font-mono-num text-[#B7F000]">· DEMO Veri Akışı</span>
          </div>
          <p className="text-xs text-[#A5A99E] mt-1">
            Canlı borsa WebSocket bağlantısı henüz bağlı olmadığından fiyatlar ve hacimler örnek DEMO verisi olarak
            sunulmaktadır.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs font-mono-num">
          <div>
            <div className="text-[#A5A99E] font-sans">Toplam Piyasa Değeri</div>
            <div className="text-base font-bold text-white mt-0.5">{formatCompactUsdBillion(totalMcap)}</div>
          </div>
          <div>
            <div className="text-[#A5A99E] font-sans">24s İşlem Hacmi</div>
            <div className="text-base font-bold text-white mt-0.5">
              ${(totalVol / 1000).toFixed(1)}B
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-[#A5A99E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="BTC, Ethereum, Solana..."
              className="pl-9 pr-3.5 py-2 rounded-xl bg-[#1B1F18] border border-white/[0.1] text-sm text-white placeholder-[#A5A99E]/60 focus:outline-none focus:border-[#B7F000] w-60"
            />
          </div>

          <button
            type="button"
            onClick={() => setOnlyFavorites((v) => !v)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              onlyFavorites
                ? 'bg-[#B7F000] text-[#10120D] border-[#B7F000]'
                : 'bg-[#1B1F18] text-[#A5A99E] border-white/[0.1] hover:text-white'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>Favori Coinler</span>
          </button>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#1B1F18] rounded-xl border border-white/[0.08]">
          {(['USD', 'TRY'] as const).map((cur) => (
            <button
              key={cur}
              type="button"
              onClick={() => setCurrency(cur)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                currency === cur ? 'bg-[#B7F000] text-[#10120D]' : 'text-[#A5A99E] hover:text-white'
              }`}
            >
              {cur}
            </button>
          ))}
        </div>
      </div>

      {/* Coin Table + Detail Split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7 bg-[#1B1F18] border border-white/[0.08] rounded-2xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#A5A99E]">
              Filtreye uygun kripto varlık bulunamadı.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-white/[0.08] text-xs text-[#A5A99E]">
                    <th className="py-3.5 pl-5 pr-3">Varlık</th>
                    <th className="py-3.5 px-3 text-right">Fiyat</th>
                    <th className="py-3.5 px-3 text-right">24s Değişim</th>
                    <th className="py-3.5 px-3 text-right hidden sm:table-cell">Piyasa Değeri</th>
                    <th className="py-3.5 px-3 hidden md:table-cell">30G Trend</th>
                    <th className="py-3.5 pr-5 pl-2 text-right">Favori</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {filtered.map((coin) => {
                    const isSelected = selectedCoin?.id === coin.id;
                    const isFav = favoriteIds.has(coin.id);
                    const displayPrice = currency === 'USD' ? formatUsd(coin.priceUsd) : formatTry(coin.priceTry);
                    return (
                      <tr
                        key={coin.id}
                        onClick={() => setSelectedCoin(coin)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#B7F000]/[0.07]' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <td className="py-3.5 pl-5 pr-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#10120D] border border-white/[0.08] flex items-center justify-center text-xs font-display font-bold text-[#B7F000]">
                              {coin.symbol.slice(0, 3)}
                            </div>
                            <div>
                              <div className="font-display font-bold text-white">{coin.name}</div>
                              <div className="text-xs text-[#A5A99E]">
                                {coin.symbol} · {coin.category}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono-num text-white whitespace-nowrap">
                          {displayPrice}
                        </td>
                        <td
                          className="py-3.5 px-3 text-right font-mono-num font-semibold whitespace-nowrap"
                          style={{ color: coin.change24hPct >= 0 ? '#B7F000' : '#FF5B5B' }}
                        >
                          {formatPct(coin.change24hPct)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono-num text-[#A5A99E] hidden sm:table-cell whitespace-nowrap">
                          {formatCompactUsdBillion(coin.marketCapUsdBillion)}
                        </td>
                        <td className="py-3.5 px-3 hidden md:table-cell">
                          <SparklineChart data={coin.history} positive={coin.change7dPct >= 0} />
                        </td>
                        <td
                          className="py-3.5 pr-5 pl-2 text-right"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite('crypto', coin.id);
                          }}
                        >
                          <button
                            type="button"
                            className={`p-1.5 rounded-lg cursor-pointer ${
                              isFav ? 'text-[#B7F000]' : 'text-[#A5A99E] hover:text-white'
                            }`}
                            aria-label={`${coin.symbol} favori`}
                          >
                            <Star className="w-4 h-4" fill={isFav ? '#B7F000' : 'none'} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected Coin Detail */}
        {selectedCoin && (
          <div className="xl:col-span-5 bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-[#A5A99E]">
                  {selectedCoin.symbol} · {selectedCoin.category} · DEMO
                </div>
                <h3 className="text-xl font-display font-bold text-white mt-0.5">{selectedCoin.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => onAddToPortfolio('crypto', selectedCoin.id)}
                className="px-3.5 py-2 rounded-xl bg-[#B7F000] text-[#10120D] text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Takibe Ekle</span>
              </button>
            </div>

            <div className="flex items-baseline justify-between border-b border-white/[0.08] pb-4">
              <div>
                <div className="text-2xl font-display font-bold font-mono-num text-white">
                  {currency === 'USD' ? formatUsd(selectedCoin.priceUsd) : formatTry(selectedCoin.priceTry)}
                </div>
                <div className="text-xs text-[#A5A99E] font-mono-num mt-0.5">
                  {currency === 'USD' ? formatTry(selectedCoin.priceTry) : formatUsd(selectedCoin.priceUsd)}
                </div>
              </div>
              <div className="text-right font-mono-num">
                <div
                  className="text-sm font-bold"
                  style={{ color: selectedCoin.change24hPct >= 0 ? '#B7F000' : '#FF5B5B' }}
                >
                  24s: {formatPct(selectedCoin.change24hPct)}
                </div>
                <div
                  className="text-xs mt-0.5"
                  style={{ color: selectedCoin.change7dPct >= 0 ? '#B7F000' : '#FF5B5B' }}
                >
                  7G: {formatPct(selectedCoin.change7dPct)}
                </div>
              </div>
            </div>

            <AreaPerformanceChart
              data={selectedCoin.history}
              height={190}
              positive={selectedCoin.change7dPct >= 0}
              valueFormatter={(v) => formatUsd(v)}
            />

            <div className="space-y-2 text-xs text-[#A5A99E] pt-2 border-t border-white/[0.08]">
              <div className="flex justify-between">
                <span>Piyasa Değeri</span>
                <span className="text-white font-mono-num">
                  {formatCompactUsdBillion(selectedCoin.marketCapUsdBillion)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>24 Saatlik İşlem Hacmi</span>
                <span className="text-white font-mono-num">
                  ${selectedCoin.volume24hUsdMillion.toLocaleString('en-US')}M
                </span>
              </div>
              <div className="flex justify-between">
                <span>Dolaşımdaki Arz</span>
                <span className="text-white font-mono-num">{selectedCoin.circulatingSupply}</span>
              </div>
            </div>

            <p className="text-sm text-[#A5A99E] leading-relaxed pt-2 border-t border-white/[0.08]">
              {selectedCoin.description}
            </p>
          </div>
        )}
      </div>

      {/* Crypto News Strip */}
      {cryptoNews.length > 0 && (
        <section className="bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-6">
          <h3 className="text-base font-display font-bold text-white mb-4">Kripto Piyasası Haberleri</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cryptoNews.map((article) => (
              <button
                key={article.id}
                type="button"
                onClick={() => onSelectNews(article)}
                className="flex items-start gap-4 p-3 rounded-xl bg-[#10120D] border border-white/[0.07] hover:border-[#B7F000]/40 transition-colors text-left cursor-pointer"
              >
                <img
                  src={NEWS_IMAGE_MAP[article.imageKey]}
                  alt={article.title}
                  referrerPolicy="no-referrer"
                  className="w-24 h-20 object-cover rounded-lg shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-[11px] text-[#A5A99E]">{article.source}</div>
                  <div className="text-sm font-semibold text-white mt-1 line-clamp-2">{article.title}</div>
                  <p className="text-xs text-[#A5A99E] mt-1 line-clamp-1">{article.summary}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
