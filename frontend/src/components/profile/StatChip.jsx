const colorMap = {
  slate:   'bg-slate-50  text-slate-900',
  amber:   'bg-amber-50  text-amber-700',
  emerald: 'bg-emerald-50 text-emerald-700',
};

const StatChip = ({ label, value, color }) => (
  <div className={`min-w-[72px] rounded-[22px] border border-white/60 px-4 py-3 text-center shadow-[0_10px_24px_rgba(15,23,42,0.05)] ${colorMap[color] || colorMap.slate}`}>
    <p className="text-xl font-black leading-none">{value}</p>
    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-60">{label}</p>
  </div>
);

export default StatChip;
