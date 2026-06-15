const ProfileEmptyState = ({
  icon: Icon,
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <section className="relative overflow-hidden rounded-[30px] border border-white/80 bg-white/94 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.06)] sm:p-10">
    <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 bg-[radial-gradient(circle_at_top_right,rgba(22,163,74,0.12),transparent_65%)]" />

    <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
      <div className="flex h-18 w-18 items-center justify-center rounded-[24px] bg-[#DCFCE7] text-[#16A34A] shadow-[0_14px_34px_rgba(22,163,74,0.15)]">
        <Icon size={30} />
      </div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-[#16A34A]">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#111827]">{title}</h2>
      <p className="mt-3 max-w-xl text-sm leading-7 text-[#6B7280]">{description}</p>

      {actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#16A34A] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(22,163,74,0.22)] transition hover:bg-[#15803D]"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  </section>
);

export default ProfileEmptyState;
