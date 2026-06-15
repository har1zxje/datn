import MiniSparkline from './MiniSparkline';

const toneMap = {
  emerald: 'border-slate-200 bg-white',
  amber:   'border-amber-200 bg-amber-50/70',
  sky:     'border-slate-200 bg-white',
  violet:  'border-violet-200 bg-violet-50/80',
  slate:   'border-slate-200 bg-white',
};

const OverviewMetricCard = ({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  onAction,
  actionLabel,
  series,
  loading,
  emphasis = 'standard',
}) => (
  <article
    className={`min-w-[274px] snap-start rounded-[26px] border p-5 shadow-[var(--shadow-soft)] ${
      toneMap[tone] || toneMap.slate
    }`}
  >
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
        {loading ? (
          <div className="mt-4 space-y-3">
            <div className="h-11 w-36 animate-pulse rounded-xl bg-slate-200" />
            <div className="h-4 w-24 animate-pulse rounded-full bg-slate-100" />
          </div>
        ) : (
          <>
            <p
              className={`mt-3 font-black tracking-tight text-slate-950 ${
                emphasis === 'hero' ? 'text-[2.85rem] leading-none' : 'text-[2.35rem] leading-none'
              }`}
            >
              {value}
            </p>
            <p className="mt-2 text-sm text-slate-500">{hint}</p>
          </>
        )}
      </div>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
        <Icon size={20} />
      </span>
    </div>

    {series?.length ? (
      <div className="mt-4">
        <MiniSparkline series={series} />
      </div>
    ) : null}

    <button
      type="button"
      onClick={onAction}
      className="mt-4 text-sm font-semibold text-slate-600 transition hover:text-emerald-700"
    >
      {actionLabel}
    </button>
  </article>
);

export default OverviewMetricCard;
