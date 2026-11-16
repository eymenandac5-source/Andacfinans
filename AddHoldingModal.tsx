import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { apiRequest, ApiError } from '../lib/api';
import type { AssetType, CryptoItem, FundItem, PortfolioHolding, PortfolioSummary, PortfolioTransaction, StockItem } from '../types/finance';
import { formatTry } from '../utils/format';

interface AddHoldingModalProps {
  open: boolean;
  funds: FundItem[];
  crypto: CryptoItem[];
  stocks: StockItem[];
  preselected?: { assetType: AssetType; assetId: string } | null;
  onClose: () => void;
  onSuccess: (payload: {
    holdings: PortfolioHolding[];
    transactions: PortfolioTransaction[];
    summary: PortfolioSummary;
  }) => void;
}

export function AddHoldingModal({
  open,
  funds,
  crypto,
  stocks,
  preselected,
  onClose,
  onSuccess,
}: AddHoldingModalProps) {
  const [assetType, setAssetType] = useState<AssetType>('stock');
  const [assetId, setAssetId] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [avgCostTry, setAvgCostTry] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const options =
    assetType === 'fund'
      ? funds.map((f) => ({ id: f.id, label: `${f.code} — ${f.name}`, price: f.price }))
      : assetType === 'crypto'
      ? crypto.map((c) => ({ id: c.id, label: `${c.symbol} — ${c.name}`, price: c.priceTry }))
      : stocks.map((s) => ({ id: s.id, label: `${s.ticker} — ${s.name}`, price: s.priceTry }));

  useEffect(() => {
    if (!open) return;
    setErrorMsg(null);
    if (preselected) {
      setAssetType(preselected.assetType);
      setAssetId(preselected.assetId);
    } else if (stocks[0]) {
      setAssetType('stock');
      setAssetId(stocks[0].id);
    }
  }, [open, preselected, stocks]);

  useEffect(() => {
    if (!open) return;
    const match = options.find((o) => o.id === assetId) || options[0];
    if (match) {
      if (match.id !== assetId) setAssetId(match.id);
      setAvgCostTry(String(match.price));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetType, assetId, open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiRequest<{
        holdings: PortfolioHolding[];
        transactions: PortfolioTransaction[];
        summary: PortfolioSummary;
      }>('/api/portfolio/holdings', {
        method: 'POST',
        body: JSON.stringify({
          assetType,
          assetId,
          quantity: Number(quantity),
          avgCostTry: Number(avgCostTry),
          notes,
        }),
      });
      onSuccess(res);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Varlık eklenemedi.');
    } finally {
      setLoading(false);
    }
  }

  const selectedOption = options.find((o) => o.id === assetId);
  const estimatedTotal = (Number(quantity) || 0) * (Number(avgCostTry) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg bg-[#1B1F18] border border-white/[0.1] rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div>
            <h2 className="text-lg font-display font-bold text-white">Portföye Takip Varlığı Ekle</h2>
            <p className="text-xs text-[#A5A99E] mt-0.5">
              Gerçek alım-satım emri iletilmez; yalnızca takip amaçlı kaydedilir.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#A5A99E] hover:text-white hover:bg-white/[0.06]"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {errorMsg && (
            <div className="rounded-xl bg-[#FF5B5B]/10 border border-[#FF5B5B]/30 px-4 py-3 text-sm text-[#FF5B5B]">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#A5A99E] mb-1.5">Varlık Sınıfı</label>
            <div className="grid grid-cols-3 gap-2 bg-[#10120D] p-1 rounded-xl border border-white/[0.08]">
              {(
                [
                  { id: 'stock', label: 'Hisse' },
                  { id: 'fund', label: 'Fon' },
                  { id: 'crypto', label: 'Kripto' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setAssetType(tab.id);
                    setAssetId('');
                  }}
                  className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    assetType === tab.id ? 'bg-[#B7F000] text-[#10120D]' : 'text-[#A5A99E] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#A5A99E] mb-1.5">Varlık Seçimi</label>
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="w-full rounded-xl bg-[#10120D] border border-white/[0.1] px-3.5 py-3 text-sm text-white focus:outline-none focus:border-[#B7F000]"
            >
              {options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#A5A99E] mb-1.5">Adet / Pay Miktarı</label>
              <input
                type="number"
                step="any"
                min="0.0001"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-xl bg-[#10120D] border border-white/[0.1] px-3.5 py-2.5 text-sm font-mono-num text-white focus:outline-none focus:border-[#B7F000]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#A5A99E] mb-1.5">
                Birim Maliyet (TL)
              </label>
              <input
                type="number"
                step="any"
                min="0.0001"
                required
                value={avgCostTry}
                onChange={(e) => setAvgCostTry(e.target.value)}
                className="w-full rounded-xl bg-[#10120D] border border-white/[0.1] px-3.5 py-2.5 text-sm font-mono-num text-white focus:outline-none focus:border-[#B7F000]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#A5A99E] mb-1.5">Not (İsteğe bağlı)</label>
            <input
              type="text"
              maxLength={160}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Örn. Uzun vadeli temettü birikimi"
              className="w-full rounded-xl bg-[#10120D] border border-white/[0.1] px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#B7F000]"
            />
          </div>

          <div className="flex items-center justify-between pt-2 pb-1 text-xs text-[#A5A99E] border-t border-white/[0.06]">
            <span>Güncel Referans Fiyat: {selectedOption ? formatTry(selectedOption.price) : '-'}</span>
            <span className="text-white font-semibold font-mono-num">
              Toplam Maliyet: {formatTry(estimatedTotal)}
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#10120D] border border-white/[0.1] text-sm font-medium text-[#A5A99E] hover:text-white cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-[#B7F000] text-[#10120D] text-sm font-semibold hover:brightness-105 disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Kaydediliyor...' : 'Portföye Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
