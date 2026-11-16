import { useId, useState } from 'react';
import type { DividendRecord, PricePoint } from '../types/finance';
import { formatShortDateTr } from '../utils/format';

interface AreaPerformanceChartProps {
  data: PricePoint[];
  height?: number;
  positive?: boolean;
  valueFormatter?: (val: number) => string;
}

export function AreaPerformanceChart({
  data,
  height = 240,
  positive = true,
  valueFormatter = (v) => v.toLocaleString('tr-TR', { maximumFractionDigits: 2 }),
}: AreaPerformanceChartProps) {
  const gradientId = useId();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!data || data.length < 2) {
    return (
      <div
        className="w-full flex items-center justify-center text-sm text-[#A5A99E] border border-white/[0.06] rounded-2xl bg-[#10120D]/40"
        style={{ height }}
      >
        Grafik verisi bulunmuyor.
      </div>
    );
  }

  const width = 720;
  const padX = 12;
  const padY = 18;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || Math.max(max * 0.05, 1);

  const points = data.map((d, idx) => {
    const x = padX + (idx / (data.length - 1)) * (width - padX * 2);
    const y = padY + (1 - (d.value - min) / range) * (height - padY * 2);
    return { x, y, ...d };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;
  const strokeColor = positive ? '#B7F000' : '#FF5B5B';

  const activePoint = hoverIdx !== null ? points[hoverIdx] : null;

  return (
    <div className="relative w-full select-none">
      {activePoint && (
        <div
          className="absolute top-2 z-10 pointer-events-none bg-[#10120D] border border-white/[0.12] rounded-xl px-3 py-1.5 shadow-lg"
          style={{
            left: `${Math.min(Math.max((activePoint.x / width) * 100, 12), 82)}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="text-[11px] text-[#A5A99E]">{formatShortDateTr(activePoint.date)}</div>
          <div className="text-sm font-semibold font-mono-num text-white">
            {valueFormatter(activePoint.value)}
          </div>
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full overflow-visible"
        style={{ height }}
        onMouseLeave={() => setHoverIdx(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          const idx = Math.round(relX * (points.length - 1));
          setHoverIdx(idx);
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.24" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={padX}
            y1={height * ratio}
            x2={width - padX}
            y2={height * ratio}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="4 4"
          />
        ))}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {activePoint ? (
          <>
            <line
              x1={activePoint.x}
              y1={padY}
              x2={activePoint.x}
              y2={height}
              stroke="rgba(255,255,255,0.2)"
              strokeDasharray="3 3"
            />
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="5"
              fill={strokeColor}
              stroke="#10120D"
              strokeWidth="2.5"
            />
          </>
        ) : (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="4"
            fill={strokeColor}
            stroke="#10120D"
            strokeWidth="2"
          />
        )}
      </svg>

      <div className="flex items-center justify-between text-[11px] text-[#A5A99E] mt-2 px-1 font-mono-num">
        <span>{formatShortDateTr(data[0].date)}</span>
        <span>{formatShortDateTr(data[Math.floor(data.length / 2)].date)}</span>
        <span>{formatShortDateTr(data[data.length - 1].date)}</span>
      </div>
    </div>
  );
}

interface SparklineChartProps {
  data: PricePoint[];
  positive: boolean;
}

export function SparklineChart({ data, positive }: SparklineChartProps) {
  if (!data || data.length < 2) return null;
  const width = 96;
  const height = 32;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const path = values
    .map((v, idx) => {
      const x = (idx / (values.length - 1)) * width;
      const y = 3 + (1 - (v - min) / range) * (height - 6);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path
        d={path}
        fill="none"
        stroke={positive ? '#B7F000' : '#FF5B5B'}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface CompareSeries {
  label: string;
  color: string;
  data: PricePoint[];
}

export function MultiCompareChart({ series, height = 220 }: { series: CompareSeries[]; height?: number }) {
  if (series.length === 0) return null;
  const width = 680;
  const padX = 12;
  const padY = 18;

  const normalized = series.map((s) => {
    const base = s.data[0]?.value || 1;
    return {
      ...s,
      points: s.data.map((pt) => ({
        date: pt.date,
        pct: ((pt.value - base) / base) * 100,
      })),
    };
  });

  const allPcts = normalized.flatMap((s) => s.points.map((p) => p.pct));
  const min = Math.min(0, ...allPcts);
  const max = Math.max(1, ...allPcts);
  const range = max - min || 1;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
        {[0, 0.5, 1].map((r) => (
          <line
            key={r}
            x1={padX}
            y1={padY + r * (height - padY * 2)}
            x2={width - padX}
            y2={padY + r * (height - padY * 2)}
            stroke="rgba(255,255,255,0.07)"
            strokeDasharray="4 4"
          />
        ))}
        {normalized.map((s) => {
          const d = s.points
            .map((p, idx) => {
              const x = padX + (idx / (s.points.length - 1)) * (width - padX * 2);
              const y = padY + (1 - (p.pct - min) / range) * (height - padY * 2);
              return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
            })
            .join(' ');
          return (
            <path
              key={s.label}
              d={d}
              fill="none"
              stroke={s.color}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>
      <div className="flex flex-wrap items-center gap-5 mt-3 text-xs text-[#A5A99E]">
        {normalized.map((s) => {
          const lastPct = s.points[s.points.length - 1]?.pct ?? 0;
          return (
            <div key={s.label} className="flex items-center gap-2">
              <span className="w-3 h-0.5 inline-block" style={{ backgroundColor: s.color }} />
              <span className="text-white font-medium">{s.label}</span>
              <span className="font-mono-num" style={{ color: lastPct >= 0 ? '#B7F000' : '#FF5B5B' }}>
                {lastPct >= 0 ? '+' : ''}
                {lastPct.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DividendBarChart({ records }: { records: DividendRecord[] }) {
  const ordered = [...records].reverse();
  const maxVal = Math.max(...ordered.map((r) => r.grossPerShareTry), 1);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
      {ordered.map((rec, idx) => {
        const heightPct = Math.max(14, Math.round((rec.grossPerShareTry / maxVal) * 100));
        return (
          <div key={`${rec.exDate}-${idx}`} className="flex flex-col justify-end">
            <div className="h-28 flex items-end justify-center bg-[#10120D] rounded-xl p-2 border border-white/[0.06]">
              <div
                className="w-full max-w-[38px] rounded-t-md transition-all"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: rec.status === 'Planlanan' ? 'rgba(183, 240, 0, 0.45)' : '#B7F000',
                }}
              />
            </div>
            <div className="mt-2 text-center">
              <div className="text-xs font-semibold font-mono-num text-white">
                ₺{rec.grossPerShareTry.toFixed(2)}
              </div>
              <div className="text-[11px] text-[#A5A99E] mt-0.5">
                {rec.year} · %{rec.yieldAtExPct.toFixed(1)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
