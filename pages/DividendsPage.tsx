import { useMemo, useState } from 'react';
import { ArrowLeftRight, Calendar, Plus, Search, Star, X } from 'lucide-react';
import { AreaPerformanceChart, DividendBarChart, MultiCompareChart } from '../components/Charts';
import type { AssetType, StockItem } from '../types/finance';
import { formatDateTr, formatPct, formatTry } from '../utils/format';

interface DividendsPageProps {
  stocks: StockItem[];
  favoriteIds: Set<string>;
  onToggleFavorite: (assetType: AssetType, assetId: string) => void;
  onAddToPortfolio: (assetType: AssetType, assetId: string) => void;
}

export function DividendsPage({
  stocks,
  favoriteIds,
  onToggleFavorite,
  onAddToPortfolio,
}: DividendsPageProps) {
  const [viewMode, setViewMode] = useState<'stocks' | 'calendar'>('stocks');
  const [search, setSearch] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(stocks[0] || null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stocks.filter((s) => {
      if (onlyFavorites && !favoriteIds.has(s.id)) return false;
      if (!q) return true;
      return (
        s.ticker.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.sector.toLowerCase().includes(q)
      );
    });
  }, [stocks, search, onlyFavorites, favoriteIds]);

  const calendarEvents = useMemo(() => {
    const events: {
      ticker: string;
      company: string;
      sector: string;
      exDate: string;
      paymentDate: string;
      grossPerShareTry: number;
      netPerShareTry: number;
      yieldAtExPct: number;
      status: 'Ödendi' | 'Planlanan';
    }[] = [];

    for (const s of stocks) {
      for (const div of s.dividendHistory) {
        events.push({
          ticker: s.ticker,
          company: s.name,
          sector: s.sector,
          ...div,
        });
      }
    }
    return events.sort((a, b) => (a.exDate < b.exDate ? 1 : -1));
  }, [stocks]);

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  }

  const comparedStocks = stocks.filter((s) => compareIds.includes(s.id));
  const compareColors = ['#B7F000', '#FFFFFF', '#7BA3FF'];

  return (
    <div className="space-y-6">
      {/* Header & View Switch */}
      <div className="bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-display font-bold text-white">Borsa İstanbul Hisseleri ve Temettü</h2>
          <p className="text-xs text-[#A5A99E] mt-1">
            Temettü verimleri, dağıtım oranları, şirket finansalları ve ödeme takvimi (DEMO BIST verisi).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 p-1 bg-[#10120D] rounded-xl border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setViewMode('stocks')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'stocks' ? 'bg-[#B7F000] text-[#10120D]' : 'text-[#A5A99E] hover:text-white'
              }`}
            >
              Hisse Analizi
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'calendar' ? 'bg-[#B7F000] text-[#10120D]' : 'text-[#A5A99E] hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Temettü Takvimi</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'stocks' && (
        <>
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-[#A5A99E] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Hisse kodu, şirket veya sektör..."
                  className="pl-9 pr-3.5 py-2 rounded-xl bg-[#1B1F18] border border-white/[0.1] text-sm text-white placeholder-[#A5A99E]/60 focus:outline-none focus:border-[#B7F000] w-64"
                />
              </div>

              <button
                type="button"
                onClick={() => setOnlyFavorites((v) => !v)}
                className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                  onlyFavorites
                    ? 'bg-[#B7F000] text-[#10120D] border-[#B7F000]'
                    : 'bg-[#1B1F18] text-[#A5A99E] border-white/[0.1] hover:text-white'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                <span>Favori Hisseler</span>
              </button>
            </div>

            <button
              type="button"
              disabled={compareIds.length < 2}
              onClick={() => setShowCompare((v) => !v)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                compareIds.length >= 2
                  ? 'bg-[#B7F000] text-[#10120D]'
                  : 'bg-[#1B1F18] text-[#A5A99E] border border-white/[0.08] opacity-60 cursor-not-allowed'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Hisseleri Karşılaştır ({compareIds.length}/3)</span>
            </button>
          </div>

          {/* Comparison Panel */}
          {showCompare && comparedStocks.length >= 2 && (
            <section className="bg-[#1B1F18] border border-[#B7F000]/30 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-display font-bold text-white">Hisse ve Temettü Karşılaştırması</h3>
                  <p className="text-xs text-[#A5A99E] mt-0.5">
                    30 günlük fiyat performansı, temettü verimi ve değerleme çarpanları
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCompare(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#A5A99E] hover:text-white hover:bg-white/[0.06]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <MultiCompareChart
                series={comparedStocks.map((s, idx) => ({
                  label: `${s.ticker} (${s.sector})`,
                  color: compareColors[idx % compareColors.length],
                  data: s.history,
                }))}
              />

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-xs text-[#A5A99E]">
                      <th className="py-2.5 pr-4">Finansal Gösterge</th>
                      {comparedStocks.map((s) => (
                        <th key={s.id} className="py-2.5 px-3 font-display text-white">
                          {s.ticker}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] font-mono-num">
                    <tr>
                      <td className="py-2.5 pr-4 text-[#A5A99E] font-sans">Hisse Fiyatı</td>
                      {comparedStocks.map((s) => (
                        <td key={s.id} className="py-2.5 px-3 text-white">{formatTry(s.priceTry)}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-[#A5A99E] font-sans">Temettü Verimi</td>
                      {comparedStocks.map((s) => (
                        <td key={s.id} className="py-2.5 px-3 text-[#B7F000] font-semibold">
                          %{s.dividendYieldPct.toFixed(2)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-[#A5A99E] font-sans">Dağıtma Oranı</td>
                      {comparedStocks.map((s) => (
                        <td key={s.id} className="py-2.5 px-3 text-white">%{s.payoutRatioPct.toFixed(1)}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-[#A5A99E] font-sans">F/K Oranı</td>
                      {comparedStocks.map((s) => (
                        <td key={s.id} className="py-2.5 px-3 text-white">{s.peRatio.toFixed(1)}x</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-[#A5A99E] font-sans">Özsermaye Kârlılığı (ROE)</td>
                      {comparedStocks.map((s) => (
                        <td key={s.id} className="py-2.5 px-3 text-white">%{s.roePct.toFixed(1)}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Split View: Stock List + Detail */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            <div className="xl:col-span-6 bg-[#1B1F18] border border-white/[0.08] rounded-2xl overflow-hidden">
              {filtered.length === 0 ? (
                <div className="p-10 text-center text-sm text-[#A5A99E]">
                  Arama kriterine uygun hisse senedi bulunamadı.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-xs text-[#A5A99E]">
                        <th className="py-3.5 pl-5 pr-2">Seç</th>
                        <th className="py-3.5 px-3">Hisse</th>
                        <th className="py-3.5 px-3 text-right">Fiyat</th>
                        <th className="py-3.5 px-3 text-right">Günlük</th>
                        <th className="py-3.5 px-3 text-right">Temettü Verimi</th>
                        <th className="py-3.5 pr-5 pl-2 text-right">Favori</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {filtered.map((stock) => {
                        const isSelected = selectedStock?.id === stock.id;
                        const isFav = favoriteIds.has(stock.id);
                        const isCompared = compareIds.includes(stock.id);
                        return (
                          <tr
                            key={stock.id}
                            onClick={() => setSelectedStock(stock)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-[#B7F000]/[0.07]' : 'hover:bg-white/[0.02]'
                            }`}
                          >
                            <td
                              className="py-3.5 pl-5 pr-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCompare(stock.id);
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isCompared}
                                onChange={() => {}}
                                aria-label={`${stock.ticker} karşılaştır`}
                                className="w-4 h-4 accent-[#B7F000] rounded cursor-pointer"
                              />
                            </td>
                            <td className="py-3.5 px-3 max-w-[190px]">
                              <div className="font-display font-bold text-white">{stock.ticker}</div>
                              <div className="text-xs text-[#A5A99E] truncate">{stock.sector}</div>
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono-num text-white whitespace-nowrap">
                              {formatTry(stock.priceTry)}
                            </td>
                            <td
                              className="py-3.5 px-3 text-right font-mono-num font-semibold whitespace-nowrap"
                              style={{ color: stock.dailyChangePct >= 0 ? '#B7F000' : '#FF5B5B' }}
                            >
                              {formatPct(stock.dailyChangePct)}
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono-num font-semibold text-[#B7F000] whitespace-nowrap">
                              %{stock.dividendYieldPct.toFixed(2)}
                            </td>
                            <td
                              className="py-3.5 pr-5 pl-2 text-right"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleFavorite('stock', stock.id);
                              }}
                            >
                              <button
                                type="button"
                                className={`p-1.5 rounded-lg cursor-pointer ${
                                  isFav ? 'text-[#B7F000]' : 'text-[#A5A99E] hover:text-white'
                                }`}
                                aria-label={`${stock.ticker} favori`}
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

            {/* Selected Stock & Dividend Detail */}
            {selectedStock && (
              <div className="xl:col-span-6 bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-6 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-[#A5A99E]">
                      BIST:{selectedStock.ticker} · {selectedStock.sector}
                    </div>
                    <h3 className="text-lg font-display font-bold text-white mt-0.5">{selectedStock.name}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAddToPortfolio('stock', selectedStock.id)}
                    className="px-3.5 py-2 rounded-xl bg-[#B7F000] text-[#10120D] text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Portföye Ekle</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#10120D] rounded-xl p-3 border border-white/[0.06]">
                    <div className="text-[11px] text-[#A5A99E]">Fiyat (DEMO)</div>
                    <div className="text-base font-bold font-mono-num text-white mt-1">
                      {formatTry(selectedStock.priceTry)}
                    </div>
                  </div>
                  <div className="bg-[#10120D] rounded-xl p-3 border border-white/[0.06]">
                    <div className="text-[11px] text-[#A5A99E]">Temettü Verimi</div>
                    <div className="text-base font-bold font-mono-num text-[#B7F000] mt-1">
                      %{selectedStock.dividendYieldPct.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-[#10120D] rounded-xl p-3 border border-white/[0.06]">
                    <div className="text-[11px] text-[#A5A99E]">F/K · PD/DD</div>
                    <div className="text-base font-bold font-mono-num text-white mt-1">
                      {selectedStock.peRatio.toFixed(1)} · {selectedStock.pbRatio.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-[#10120D] rounded-xl p-3 border border-white/[0.06]">
                    <div className="text-[11px] text-[#A5A99E]">Yıllık Getiri</div>
                    <div className="text-base font-bold font-mono-num text-[#B7F000] mt-1">
                      {formatPct(selectedStock.yearlyChangePct)}
                    </div>
                  </div>
                </div>

                <AreaPerformanceChart
                  data={selectedStock.history}
                  height={165}
                  positive={selectedStock.monthlyChangePct >= 0}
                  valueFormatter={(v) => formatTry(v)}
                />

                {/* Dividend History Bar Chart */}
                <div className="pt-2 border-t border-white/[0.08]">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-display font-bold text-white">
                      Hisse Başı Brüt Temettü Geçmişi (TL)
                    </h4>
                    <span className="text-xs text-[#A5A99E]">
                      Dağıtım Oranı: %{selectedStock.payoutRatioPct.toFixed(0)}
                    </span>
                  </div>
                  <DividendBarChart records={selectedStock.dividendHistory} />
                </div>

                {/* Dividend Payments Table */}
                <div className="pt-2 border-t border-white/[0.08]">
                  <h4 className="text-sm font-display font-bold text-white mb-3">Temettü Ödeme Tarihleri</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-white/[0.08] text-[#A5A99E]">
                          <th className="py-2 pr-3">Hak Kullanım</th>
                          <th className="py-2 px-3">Ödeme Tarihi</th>
                          <th className="py-2 px-3 text-right">Brüt / Net</th>
                          <th className="py-2 pl-3 text-right">Durum</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06] font-mono-num">
                        {selectedStock.dividendHistory.map((d, i) => (
                          <tr key={`${d.exDate}-${i}`}>
                            <td className="py-2.5 pr-3 text-white">{formatDateTr(d.exDate)}</td>
                            <td className="py-2.5 px-3 text-[#A5A99E]">{formatDateTr(d.paymentDate)}</td>
                            <td className="py-2.5 px-3 text-right text-white">
                              ₺{d.grossPerShareTry.toFixed(2)} / ₺{d.netPerShareTry.toFixed(2)}
                            </td>
                            <td
                              className="py-2.5 pl-3 text-right font-sans font-semibold"
                              style={{ color: d.status === 'Planlanan' ? '#B7F000' : '#A5A99E' }}
                            >
                              {d.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Company Fundamentals */}
                <div className="pt-2 border-t border-white/[0.08] space-y-2.5">
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[#A5A99E]">Gelir Büyümesi:</span>{' '}
                      <span className="text-white font-mono-num font-semibold">
                        +%{selectedStock.revenueGrowthPct}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#A5A99E]">Net Kâr Marjı:</span>{' '}
                      <span className="text-white font-mono-num font-semibold">%{selectedStock.netMarginPct}</span>
                    </div>
                    <div>
                      <span className="text-[#A5A99E]">ROE:</span>{' '}
                      <span className="text-white font-mono-num font-semibold">%{selectedStock.roePct}</span>
                    </div>
                  </div>
                  <p className="text-sm text-[#A5A99E] leading-relaxed">{selectedStock.companySummary}</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {viewMode === 'calendar' && (
        <section className="bg-[#1B1F18] border border-white/[0.08] rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/[0.08]">
            <h3 className="text-base font-display font-bold text-white">Borsa İstanbul Temettü Takvimi</h3>
            <p className="text-xs text-[#A5A99E] mt-1">
              Planlanan ve geçmiş temettü hak kullanım ile nakit ödeme tarihleri
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/[0.08] text-xs text-[#A5A99E]">
                  <th className="py-3.5 pl-6 pr-3">Şirket</th>
                  <th className="py-3.5 px-3">Hak Kullanım Tarihi</th>
                  <th className="py-3.5 px-3">Nakit Ödeme Tarihi</th>
                  <th className="py-3.5 px-3 text-right">Brüt Temettü</th>
                  <th className="py-3.5 px-3 text-right">Net Temettü</th>
                  <th className="py-3.5 px-3 text-right">Verim</th>
                  <th className="py-3.5 pr-6 pl-3 text-right">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {calendarEvents.map((ev, idx) => (
                  <tr key={`${ev.ticker}-${ev.exDate}-${idx}`} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 pl-6 pr-3">
                      <div className="font-display font-bold text-white">{ev.ticker}</div>
                      <div className="text-xs text-[#A5A99E]">{ev.sector}</div>
                    </td>
                    <td className="py-3.5 px-3 font-mono-num text-white">{formatDateTr(ev.exDate)}</td>
                    <td className="py-3.5 px-3 font-mono-num text-[#A5A99E]">{formatDateTr(ev.paymentDate)}</td>
                    <td className="py-3.5 px-3 text-right font-mono-num text-white">
                      {formatTry(ev.grossPerShareTry)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono-num text-[#A5A99E]">
                      {formatTry(ev.netPerShareTry)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono-num text-[#B7F000]">
                      %{ev.yieldAtExPct.toFixed(2)}
                    </td>
                    <td
                      className="py-3.5 pr-6 pl-3 text-right text-xs font-semibold"
                      style={{ color: ev.status === 'Planlanan' ? '#B7F000' : '#A5A99E' }}
                    >
                      {ev.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
