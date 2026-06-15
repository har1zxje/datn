const EmptyState = ({ title, description }) => (
  <div className="rounded-[30px] border border-dashed border-slate-200 bg-white p-10 text-center shadow-[var(--shadow-soft)]">
    <p className="text-base font-bold text-slate-900">{title}</p>
    <p className="mt-2 text-sm text-slate-500">{description}</p>
  </div>
);

export default EmptyState;
