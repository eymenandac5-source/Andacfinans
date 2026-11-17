export function formatTry(value: number, decimals = 2): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatUsd(value: number, decimals?: number): string {
  const d = decimals ?? (value < 2 ? 4 : 2);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(value);
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPct(value: number, showSign = true): string {
  const abs = Math.abs(value).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (!showSign) return `%${abs}`;
  if (value > 0) return `+%${abs}`;
  if (value < 0) return `-%${abs}`;
  return `%${abs}`;
}

export function formatCompactTry(millionValue: number): string {
  if (millionValue >= 1000) {
    return `₺${(millionValue / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} Mr`;
  }
  return `₺${millionValue.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} Mn`;
}

export function formatCompactUsdBillion(billionValue: number): string {
  if (billionValue >= 1000) {
    return `$${(billionValue / 1000).toLocaleString('en-US', { maximumFractionDigits: 2 })}T`;
  }
  return `$${billionValue.toLocaleString('en-US', { maximumFractionDigits: 1 })}B`;
}

export function formatDateTr(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatShortDateTr(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
  });
}
