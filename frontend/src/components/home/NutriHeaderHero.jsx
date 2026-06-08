import React from 'react';
import { Gift, Leaf, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { useAppSettings } from '../../context/AppSettingsContext';

const FEATURE_BADGES = [
  { icon: Leaf, label: 'Huu co 100%', color: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  { icon: Zap, label: 'Giao nhanh trong ngay', color: 'bg-amber-50 text-amber-700 ring-amber-100' },
  { icon: ShieldCheck, label: 'AI hau giao hang', color: 'bg-sky-50 text-sky-700 ring-sky-100' },
];

const EVIDENCE_ITEMS = [
  { value: '24h', label: 'Cua so xac nhan sau giao' },
  { value: 'AI + anh that', label: 'Bang chung do tuoi' },
  { value: 'Don hang ro rang', label: 'Theo doi va xu ly nhanh' },
];

const NutriHeaderHero = ({
  onOpenFreshness,
  onOpenShop,
}) => {
  const { t } = useAppSettings();

  return (
    <section className="overflow-hidden rounded-[2.25rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-0)] shadow-[var(--shadow-overlay)]">
      <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative overflow-hidden bg-[linear-gradient(145deg,rgba(238,248,241,0.92),rgba(255,255,255,0.94),rgba(248,235,204,0.38))] p-7 md:p-10 lg:p-12">
          <div className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-emerald-100/60 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-56 w-56 rounded-full bg-amber-100/50 blur-3xl" />

          <div className="relative z-10 max-w-2xl space-y-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700 ring-1 ring-emerald-100">
              <Sparkles size={12} />
              {t('hero_badge')}
            </span>

            <div className="space-y-4">
              <h1 className="max-w-xl text-3xl font-black leading-[1.08] tracking-[-0.03em] text-slate-950 md:text-[3rem]">
                {t('hero_title')}
              </h1>
              <p className="max-w-xl text-[0.98rem] leading-8 text-slate-600 md:text-base">
                {t('hero_desc')}
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {FEATURE_BADGES.map(({ icon: Icon, label, color }) => (
                <span
                  key={label}
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-bold ring-1 ${color}`}
                >
                  <Icon size={13} />
                  {label}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={onOpenShop}
                className="rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-black text-white shadow-[0_18px_32px_rgba(15,154,98,0.24)] transition hover:-translate-y-0.5 hover:bg-emerald-700"
              >
                {t('hero_shop')}
              </button>
              <button
                type="button"
                onClick={onOpenFreshness}
                className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--line-strong)] bg-white/90 px-6 py-3.5 text-sm font-bold text-slate-800 transition hover:border-emerald-200 hover:bg-emerald-50"
              >
                <Gift size={16} />
                {t('hero_scanner')}
              </button>
            </div>

            <div className="grid gap-3 pt-2 sm:grid-cols-3">
              {EVIDENCE_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[22px] border border-white/70 bg-white/80 px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
                >
                  <p className="text-lg font-black text-slate-950">{item.value}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative min-h-[320px] overflow-hidden bg-slate-950">
          <img
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1400&auto=format&fit=crop"
            alt="FreshFood AI organic food"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08),rgba(15,23,42,0.48))]" />

          <div className="absolute inset-x-5 bottom-5 rounded-[26px] border border-white/15 bg-slate-950/72 p-5 text-white shadow-[0_24px_60px_rgba(15,23,42,0.3)] backdrop-blur-md">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-300">
              Freshness workflow
            </p>
            <p className="mt-2 text-xl font-black leading-tight">
              Kiem chung do tuoi truoc va sau khi mua, khong chi dua vao mo ta ban hang.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-200/88">
              Shop, giao hang, xac nhan bang anh that va xu ly boi thuong cung mot he thong.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NutriHeaderHero;
