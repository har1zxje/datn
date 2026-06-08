export const uiLayout = {
  page: 'min-h-screen app-page-bg',
  container: 'fresh-container py-8 md:py-10 lg:py-12',
  sectionStack: 'space-y-8 lg:space-y-10',
  sectionCard:
    'rounded-[28px] border border-[color:var(--line-soft)] bg-[color:var(--surface-0)] p-6 shadow-[var(--shadow-soft)] md:p-7 lg:p-8',
  sectionCardLg:
    'rounded-[30px] border border-[color:var(--line-soft)] bg-[color:var(--surface-0)] p-7 shadow-[var(--shadow-soft)] lg:p-9',
};

export const uiControl = {
  fieldLabel: 'mb-3 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500',
  fieldShell:
    'flex h-14 items-center rounded-2xl border border-[color:var(--line-strong)] bg-[color:var(--surface-0)] px-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-100',
  input:
    'h-14 w-full rounded-2xl border border-[color:var(--line-strong)] bg-[color:var(--surface-0)] px-5 text-sm font-semibold text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.05)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100',
  iconInput:
    'min-w-0 flex-1 border-0 bg-transparent px-3 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400',
  primaryButton:
    'inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 text-sm font-black text-white shadow-[0_14px_28px_rgba(5,150,105,0.24)] transition hover:-translate-y-0.5 hover:bg-emerald-700',
  secondaryIconButton:
    'inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[color:var(--line-strong)] bg-[color:var(--surface-0)] text-slate-600 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition hover:bg-slate-50',
};
