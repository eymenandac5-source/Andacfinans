import { useMemo, useState } from 'react';
import { ArrowLeftRight, Plus, Search, Star, X } from 'lucide-react';
import { AreaPerformanceChart, MultiCompareChart, SparklineChart } from '../components/Charts';
import type { AssetType, FundItem } from '../types/finance';
import { formatCompactTry, formatNumber, formatPct, formatTry } from '../utils/format';

interface FundsPageProps {
  funds: FundItem[];
  favoriteIds: Set<string>;
  onToggleFavorite: (assetType: AssetType, assetId: string) => void;
  onAddToPortfolio: (assetType: AssetType, assetId: string) => void;
}

const CATEGORIES = ['Tümü', 'Teknoloji', 'Hisse Senedi', 'Değişken', 'Katılım', 'Para Piyasası'] as const;

export function FundsPage({ funds, favoriteIds, onToggleFavorite, onAddToPortfolio }: FundsPageProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('Tümü');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [selectedFund, setSelectedFund] = useState<FundItem | null>(funds[0] || null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return funds.filter((f) => {
      if (category !== 'Tümü' && f.category !== category) return false;
      if (onlyFavorites && !favoriteIds.has(f.id)) return false;
      if (!q) return true;
      return (
        f.code.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q) ||
        f.founder.toLowerCase().includes(q)
      );
    });
  }, [funds, search, category, onlyFavorites, favoriteIds]);

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  }

  const comparedFunds = funds.filter((f) => compareIds.includes(f.id));
  const compareColors = ['#B7F000', '#FFFFFF', '#7BA3FF'];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-display font-bold text-white">TEFAS Yatırım Fonları</h2>
          <p className="text-xs text-[#A5A99E] mt-1">
            Gösterilen fon fiyatları ve getirileri örnek DEMO verisidir. Günlük, haftalık, aylık ve yıllık
            getiri kıyaslaması yapabilirsiniz.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-[#A5A99E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Fon kodu veya adı ara..."
              className="pl-9 pr-3.5 py-2 rounded-xl bg-[#10120D] border border-white/[0.1] text-sm text-white placeholder-[#A5A99E]/60 focus:outline-none focus:border-[#B7F000] w-56"
            />
          </div>

          <button
            type="button"
            onClick={() => setOnlyFavorites((v) => !v)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              onlyFavorites
                ? 'bg-[#B7F000] text-[#10120D] border-[#B7F000]'
                : 'bg-[#10120D] text-[#A5A99E] border-white/[0.1] hover:text-white'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>Favoriler</span>
          </button>

          <button
            type="button"
            disabled={compareIds.length < 2}
            onClick={() => setShowCompare((v) => !v)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              compareIds.length >= 2
                ? 'bg-[#B7F000] text-[#10120D]'
                : 'bg-[#10120D] text-[#A5A99E] border border-white/[0.08] opacity-60 cursor-not-allowed'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Karşılaştır ({compareIds.length}/3)</span>
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              category === cat
                ? 'bg-[#B7F000] text-[#10120D]'
                : 'bg-[#1B1F18] text-[#A5A99E] border border-white/[0.08] hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Comparison Panel */}
      {showCompare && comparedFunds.length >= 2 && (
        <section className="bg-[#1B1F18] border border-[#B7F000]/30 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-display font-bold text-white">Fon Performans Karşılaştırması</h3>
              <p className="text-xs text-[#A5A99E] mt-0.5">30 günlük normalize (%) getiri eğrisi ve temel metrikler</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCompare(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#A5A99E] hover:text-white hover:bg-white/[0.06]"
              aria-label="Karşılaştırmayı kapat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <MultiCompareChart
            series={comparedFunds.map((f, idx) => ({
              label: `${f.code} (${f.category})`,
              color: compareColors[idx % compareColors.length],
              data: f.history,
            }))}
          />

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/[0.08] text-xs text-[#A5A99E]">
                  <th className="py-2.5 pr-4">Metrik</th>
                  {comparedFunds.map((f) => (
                    <th key={f.id} className="py-2.5 px-3 font-display text-white">
                      {f.code}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] font-mono-num">
                <tr>
                  <td className="py-2.5 pr-4 text-[#A5A99E] font-sans">Güncel Fiyat</td>
                  {comparedFunds.map((f) => (
                    <td key={f.id} className="py-2.5 px-3 text-white">{formatTry(f.price, 4)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-[#A5A99E] font-sans">Aylık Getiri</td>
                  {comparedFunds.map((f) => (
                    <td key={f.id} className="py-2.5 px-3 text-[#B7F000]">{formatPct(f.monthlyChangePct)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-[#A5A99E] font-sans">Yıllık Getiri</td>
                  {comparedFunds.map((f) => (
                    <td key={f.id} className="py-2.5 px-3 text-[#B7F000]">{formatPct(f.yearlyChangePct)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-[#A5A99E] font-sans">Yönetim Ücreti</td>
                  {comparedFunds.map((f) => (
                    <td key={f.id} className="py-2.5 px-3 text-white">%{f.managementFeePct.toFixed(2)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-[#A5A99E] font-sans">Risk Değeri (1-7)</td>
                  {comparedFunds.map((f) => (
                    <td key={f.id} className="py-2.5 px-3 text-white">{f.riskLevel} / 7</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Main Split: Fund Table + Selected Fund Detail */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7 bg-[#1B1F18] border border-white/[0.08] rounded-2xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#A5A99E]">
              Arama kriterlerinize uygun yatırım fonu bulunamadı.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-white/[0.08] text-xs text-[#A5A99E]">
                    <th className="py-3.5 pl-5 pr-2">Seç</th>
                    <th className="py-3.5 px-3">Fon</th>
                    <th className="py-3.5 px-3 text-right">Fiyat</th>
                    <th className="py-3.5 px-3 text-right">Günlük</th>
                    <th className="py-3.5 px-3 text-right">Yıllık</th>
                    <th className="py-3.5 px-3 hidden sm:table-cell">Trend</th>
                    <th className="py-3.5 pr-5 pl-2 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {filtered.map((fund) => {
                    const isSelected = selectedFund?.id === fund.id;
                    const isFav = favoriteIds.has(fund.id);
                    const isCompared = compareIds.includes(fund.id);
                    return (
                      <tr
                        key={fund.id}
                        onClick={() => setSelectedFund(fund)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#B7F000]/[0.07]' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <td
                          className="py-3.5 pl-5 pr-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCompare(fund.id);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isCompared}
                            onChange={() => {}}
                            aria-label={`${fund.code} karşılaştırmaya ekle`}
                            className="w-4 h-4 accent-[#B7F000] rounded cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-3 max-w-[230px]">
                          <div className="flex items-center gap-2">
                            <span className="font-display font-bold text-white">{fund.code}</span>
                            <span className="text-[11px] text-[#A5A99E]">· {fund.category}</span>
                          </div>
                          <div className="text-xs text-[#A5A99E] truncate mt-0.5">{fund.name}</div>
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono-num text-white whitespace-nowrap">
                          {formatTry(fund.price, 4)}
                        </td>
                        <td
                          className="py-3.5 px-3 text-right font-mono-num font-semibold whitespace-nowrap"
                          style={{ color: fund.dailyChangePct >= 0 ? '#B7F000' : '#FF5B5B' }}
                        >
                          {formatPct(fund.dailyChangePct)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono-num text-[#B7F000] whitespace-nowrap">
                          {formatPct(fund.yearlyChangePct)}
                        </td>
                        <td className="py-3.5 px-3 hidden sm:table-cell">
                          <SparklineChart data={fund.history} positive={fund.monthlyChangePct >= 0} />
                        </td>
                        <td
                          className="py-3.5 pr-5 pl-2 text-right"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite('fund', fund.id);
                          }}
                        >
                          <button
                            type="button"
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isFav ? 'text-[#B7F000]' : 'text-[#A5A99E] hover:text-white'
                            }`}
                            aria-label={`${fund.code} favori`}
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

        {/* Fund Detail Panel */}
        {selectedFund && (
          <div className="xl:col-span-5 bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-[#A5A99E]">
                  {selectedFund.code} · {selectedFund.category} · {selectedFund.founder}
                </div>
                <h3 className="text-lg font-display font-bold text-white mt-1">{selectedFund.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => onAddToPortfolio('fund', selectedFund.id)}
                className="px-3.5 py-2 rounded-xl bg-[#B7F000] text-[#10120D] text-xs font-semibold flex items-center gap-1.5 shrink-0 hover:brightness-105 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Takibe Ekle</span>
              </button>
            </div>

            <div className="flex items-baseline justify-between border-b border-white/[0.08] pb-4">
              <div>
                <div className="text-xs text-[#A5A99E]">Birim Pay Değeri (DEMO)</div>
                <div className="text-2xl font-display font-bold font-mono-num text-white mt-0.5">
                  {formatTry(selectedFund.price, 4)}
                </div>
              </div>
              <div className="text-right font-mono-num">
                <div className="text-xs text-[#A5A99E]">Risk Skoru</div>
                <div className="text-base font-bold text-white mt-0.5">{selectedFund.riskLevel} / 7</div>
              </div>
            </div>

            <AreaPerformanceChart
              data={selectedFund.history}
              height={180}
              positive={selectedFund.monthlyChangePct >= 0}
              valueFormatter={(v) => formatTry(v, 4)}
            />

            <div className="grid grid-cols-4 gap-3 pt-1">
              {[
                { label: 'Günlük', val: selectedFund.dailyChangePct },
                { label: 'Haftalık', val: selectedFund.weeklyChangePct },
                { label: 'Aylık', val: selectedFund.monthlyChangePct },
                { label: 'Yıllık', val: selectedFund.yearlyChangePct },
              ].map((p) => (
                <div key={p.label} className="bg-[#10120D] rounded-xl p-3 border border-white/[0.06]">
                  <div className="text-[11px] text-[#A5A99E]">{p.label}</div>
                  <div
                    className="text-sm font-bold font-mono-num mt-1"
                    style={{ color: p.val >= 0 ? '#B7F000' : '#FF5B5B' }}
                  >
                    {formatPct(p.val)}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 text-xs text-[#A5A99E] pt-2 border-t border-white/[0.08]">
              <div className="flex justify-between">
                <span>Fon Toplam Büyüklüğü</span>
                <span className="text-white font-mono-num">{formatCompactTry(selectedFund.aumMillionTry)}</span>
              </div>
              <div className="flex justify-between">
                <span>Yatırımcı Sayısı</span>
                <span className="text-white font-mono-num">{formatNumber(selectedFund.investorCount, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Yıllık Yönetim Ücreti</span>
                <span className="text-white font-mono-num">%{selectedFund.managementFeePct.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="shrink-0">Karşılaştırma Ölçütü</span>
                <span className="text-white text-right">{selectedFund.benchmark}</span>
              </div>
            </div>

            <p className="text-sm text-[#A5A99E] leading-relaxed pt-2 border-t border-white/[0.08]">
              {selectedFund.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
