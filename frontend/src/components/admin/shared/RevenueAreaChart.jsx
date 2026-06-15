import { useMemo, useState } from 'react';
import { formatCompactNumber, formatMoney } from '../../../utils/admin/formatters';
import {
  buildAreaPath,
  buildChartCoordinates,
  buildLinePath,
} from '../../../utils/admin/stockHelpers';

const RevenueAreaChart = ({ series }) => {
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max((series?.length || 1) - 1, 0),
  );
  const points = useMemo(
    () => buildChartCoordinates(series, 720, 260, 20, 18),
    [series],
  );
  const activePoint =
    points[Math.min(activeIndex, Math.max(points.length - 1, 0))] || null;
  const maxRevenue = Math.max(...points.map((p) => p.value), 0);
  const yAxisLabels = useMemo(
    () =>
      [maxRevenue, maxRevenue * 0.66, maxRevenue * 0.33, 0].map((v) => Math.round(v)),
    [maxRevenue],
  );

  return (
    <div className="rounded-[24px] border border-[color:var(--line-soft)] bg-slate-50/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
            7 ngay gan nhat
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950">
            {formatMoney(activePoint?.value || 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-right text-xs text-slate-500">
          <p className="font-semibold text-slate-900">{activePoint?.label || ''}</p>
          <p>{formatCompactNumber(activePoint?.orders || 0)} don</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[52px_minmax(0,1fr)]">
        <div className="hidden justify-between py-2 text-[11px] font-semibold text-slate-400 lg:flex lg:flex-col">
          {yAxisLabels.map((v, i) => (
            <span key={`${v}-${i}`}>{v > 0 ? `${Math.round(v / 1000)}k` : '0'}</span>
          ))}
        </div>

        <div>
          <div className="relative h-[260px]">
            <svg viewBox="0 0 720 260" className="h-full w-full">
              {[60, 120, 180, 240].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="720"
                  y2={y}
                  stroke="rgba(148,163,184,0.18)"
                  strokeDasharray="4 6"
                />
              ))}
              <path d={buildAreaPath(points, 260)} fill="rgba(22,163,74,0.10)" />
              <path
                d={buildLinePath(points)}
                fill="none"
                stroke="#16A34A"
                strokeWidth="3"
                strokeLinecap="round"
              />
              {points.map((p, i) => (
                <circle
                  key={p.label || i}
                  cx={p.x}
                  cy={p.y}
                  r={i === activeIndex ? 5.5 : 4}
                  fill={i === activeIndex ? '#166534' : '#16A34A'}
                  stroke="white"
                  strokeWidth="2"
                />
              ))}
            </svg>

            <div className="absolute inset-0 grid grid-cols-7">
              {points.map((p, i) => (
                <button
                  key={`${p.label}-${i}`}
                  type="button"
                  onMouseEnter={() => setActiveIndex(i)}
                  onFocus={() => setActiveIndex(i)}
                  onClick={() => setActiveIndex(i)}
                  className="h-full w-full"
                  aria-label={`${p.label}: ${formatMoney(p.value)}`}
                />
              ))}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-7 text-center text-xs font-semibold text-slate-500">
            {points.map((p, i) => (
              <span
                key={`${p.label}-tick-${i}`}
                className={i === activeIndex ? 'text-slate-900' : ''}
              >
                {p.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueAreaChart;
