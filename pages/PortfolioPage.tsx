import { Briefcase, Lock, Plus, Trash2 } from 'lucide-react';
import { AreaPerformanceChart } from '../components/Charts';
import type { PortfolioHolding, PortfolioSummary, PortfolioTransaction, UserProfile } from '../types/finance';
import { formatDateTr, formatNumber, formatPct, formatTry } from '../utils/format';

interface PortfolioPageProps {
  user: UserProfile | null;
  holdings: PortfolioHolding[];
  transactions: PortfolioTransaction[];
  summary: PortfolioSummary | null;
  onOpenAuth: (mode?: 'welcome' | 'login' | 'register') => void;
  onOpenAddHolding: () => void;
  onRemoveHolding: (holdingId: string) => void;
}

export function PortfolioPage({
  user,
  holdings,
  transactions,
  summary,
  onOpenAuth,
  onOpenAddHolding,
  onRemoveHolding,
}: PortfolioPageProps) {
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto my-8 bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-8 sm:p-10 text-center space-y-5">
        <div className="w-12 h-12 rounded-2xl bg-[#B7F000]/15 text-[#B7F000] flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-display font-bold text-white">
          Kişisel Portföy Takibi İçin Giriş Yapın
        </h2>
        <p className="text-sm sm:text-base text-[#A5A99E] leading-relaxed">
          Yatırım fonlarınızı, Borsa İstanbul hisse senetlerinizi ve kripto varlıklarınızı tek ekranda
          izlemek için hesabınıza giriş yapın veya ücretsiz üye olun. Bu alan yalnızca portföy takibi
          amaçlıdır; gerçek para transferi veya aracı kurum emri gerçekleştirilmez.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => onOpenAuth('login')}
            className="px-6 py-3 rounded-xl bg-[#B7F000] text-[#10120D] font-semibold text-sm hover:brightness-105 cursor-pointer"
          >
            E-posta ile Giriş Yap
          </button>
          <button
            type="button"
            onClick={() => onOpenAuth('register')}
            className="px-6 py-3 rounded-xl bg-[#10120D] border border-white/[0.12] text-white font-semibold text-sm hover:border-[#B7F000]/50 cursor-pointer"
          >
            Hesap Oluştur
          </button>
        </div>
      </div>
    );
  }

  const totalValue = summary?.totalValueTry ?? 0;
  const totalCost = summary?.totalCostTry ?? 0;
  const totalPnl = summary?.totalPnlTry ?? 0;
  const totalPnlPct = summary?.totalPnlPct ?? 0;

  return (
    <div className="space-y-6">
      {/* Top Action Banner */}
      <div className="bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-display font-bold text-white">Portföy Özeti ve Varlık Takibi</h2>
          <p className="text-xs text-[#A5A99E] mt-1">
            Pozisyonlarınız DEMO piyasa referans fiyatlarıyla anlık olarak hesaplanır. Gerçek alım-satım
            işlemi yapılmaz.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAddHolding}
          className="px-4 py-2.5 rounded-xl bg-[#B7F000] text-[#10120D] text-sm font-semibold flex items-center gap-1.5 hover:brightness-105 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Varlık Ekle</span>
        </button>
      </div>

      {holdings.length === 0 ? (
        <div className="bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#10120D] border border-white/[0.08] text-[#B7F000] flex items-center justify-center mx-auto">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-display font-bold text-white">Portföyünüz Henüz Boş</h3>
          <p className="text-sm text-[#A5A99E] max-w-md mx-auto">
            Takip etmek istediğiniz yatırım fonu, BIST hissesi veya kripto varlığı ekleyerek maliyet, kâr-zarar
            ve varlık dağılımı analizini başlatın.
          </p>
          <button
            type="button"
            onClick={onOpenAddHolding}
            className="px-5 py-3 rounded-xl bg-[#B7F000] text-[#10120D] text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>İlk Varlığı Ekle</span>
          </button>
        </div>
      ) : (
        <>
          {/* Summary KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-5">
              <div className="text-xs text-[#A5A99E]">Toplam Portföy Değeri</div>
              <div className="text-2xl font-display font-bold font-mono-num text-white mt-2">
                {formatTry(totalValue)}
              </div>
            </div>
            <div className="bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-5">
              <div className="text-xs text-[#A5A99E]">Toplam Maliyet</div>
              <div className="text-2xl font-display font-bold font-mono-num text-white mt-2">
                {formatTry(totalCost)}
              </div>
            </div>
            <div className="bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-5">
              <div className="text-xs text-[#A5A99E]">Toplam Kâr / Zarar</div>
              <div
                className="text-2xl font-display font-bold font-mono-num mt-2"
                style={{ color: totalPnl >= 0 ? '#B7F000' : '#FF5B5B' }}
              >
                {totalPnl >= 0 ? '+' : ''}
                {formatTry(totalPnl)}
              </div>
            </div>
            <div className="bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-5">
              <div className="text-xs text-[#A5A99E]">Net Getiri Oranı</div>
              <div
                className="text-2xl font-display font-bold font-mono-num mt-2"
                style={{ color: totalPnlPct >= 0 ? '#B7F000' : '#FF5B5B' }}
              >
                {formatPct(totalPnlPct)}
              </div>
            </div>
          </div>

          {/* Performance & Allocation Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-6">
              <h3 className="text-base font-display font-bold text-white mb-4">Portföy Performans Eğrisi</h3>
              <AreaPerformanceChart
                data={summary?.performanceSeries || []}
                height={210}
                positive={totalPnl >= 0}
                valueFormatter={(v) => formatTry(v)}
              />
            </div>

            <div className="lg:col-span-4 bg-[#1B1F18] border border-white/[0.08] rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-display font-bold text-white">Varlık Sınıfı Dağılımı</h3>
              <div className="space-y-4 pt-2">
                {(summary?.allocation || []).map((al) => (
                  <div key={al.assetType} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#A5A99E]">{al.label}</span>
                      <span className="font-mono-num text-white font-semibold">
                        %{al.percentage} · {formatTry(al.valueTry, 0)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#10120D] overflow-hidden">
                      <div
                        className="h-full bg-[#B7F000]"
                        style={{ width: `${Math.min(100, al.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Holdings Table */}
          <section className="bg-[#1B1F18] border border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.08]">
              <h3 className="text-base font-display font-bold text-white">Portföy Varlık Listesi</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-white/[0.08] text-xs text-[#A5A99E]">
                    <th className="py-3.5 pl-6 pr-3">Varlık</th>
                    <th className="py-3.5 px-3 text-right">Miktar</th>
                    <th className="py-3.5 px-3 text-right">Ort. Maliyet</th>
                    <th className="py-3.5 px-3 text-right">Güncel Fiyat</th>
                    <th className="py-3.5 px-3 text-right">Piyasa Değeri</th>
                    <th className="py-3.5 px-3 text-right">Kâr / Zarar</th>
                    <th className="py-3.5 pr-6 pl-3 text-right">Kaldır</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {holdings.map((h) => (
                    <tr key={h.id} className="hover:bg-white/[0.02]">
                      <td className="py-3.5 pl-6 pr-3">
                        <div className="font-display font-bold text-white">{h.symbol}</div>
                        <div className="text-xs text-[#A5A99E] truncate max-w-[200px]">
                          {h.assetType === 'fund' ? 'Fon' : h.assetType === 'crypto' ? 'Kripto' : 'Hisse'} ·{' '}
                          {h.name}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono-num text-white">
                        {formatNumber(h.quantity, h.assetType === 'crypto' ? 4 : 2)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono-num text-[#A5A99E]">
                        {formatTry(h.avgCostTry, h.assetType === 'fund' ? 4 : 2)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono-num text-white">
                        {formatTry(h.currentPriceTry, h.assetType === 'fund' ? 4 : 2)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono-num font-semibold text-white">
                        {formatTry(h.marketValueTry)}
                      </td>
                      <td
                        className="py-3.5 px-3 text-right font-mono-num font-semibold"
                        style={{ color: h.unrealizedPnlTry >= 0 ? '#B7F000' : '#FF5B5B' }}
                      >
                        <div>
                          {h.unrealizedPnlTry >= 0 ? '+' : ''}
                          {formatTry(h.unrealizedPnlTry)}
                        </div>
                        <div className="text-xs">{formatPct(h.unrealizedPnlPct)}</div>
                      </td>
                      <td className="py-3.5 pr-6 pl-3 text-right">
                        <button
                          type="button"
                          onClick={() => onRemoveHolding(h.id)}
                          className="p-2 rounded-lg text-[#A5A99E] hover:text-[#FF5B5B] hover:bg-[#FF5B5B]/10 transition-colors cursor-pointer"
                          aria-label={`${h.symbol} pozisyonunu kaldır`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Transactions Log */}
          {transactions.length > 0 && (
            <section className="bg-[#1B1F18] border border-white/[0.08] rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/[0.08]">
                <h3 className="text-base font-display font-bold text-white">Son Portföy Kayıtları</h3>
              </div>
              <div className="divide-y divide-white/[0.06] px-6">
                {transactions.slice(0, 8).map((tx) => (
                  <div key={tx.id} className="py-3.5 flex items-center justify-between gap-4 text-sm">
                    <div>
                      <span className="font-semibold text-white">{tx.symbol}</span>
                      <span className="text-xs text-[#A5A99E] ml-2">
                        {tx.txType === 'buy' ? 'Takibe Alış' : tx.txType === 'sell' ? 'Takip Çıkışı' : 'Temettü'} ·{' '}
                        {formatDateTr(tx.txDate)}
                      </span>
                    </div>
                    <div className="font-mono-num text-right">
                      <span className="text-white font-semibold">{formatTry(tx.totalAmountTry)}</span>
                      <span className="text-xs text-[#A5A99E] ml-2">({tx.quantity} adet)</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
