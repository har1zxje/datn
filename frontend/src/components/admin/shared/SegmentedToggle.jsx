const SegmentedToggle = ({ value, options, onChange, size = 'default' }) => (
  <div
    className={`inline-flex rounded-[18px] border border-slate-200 bg-slate-100/80 p-1 ${
      size === 'compact' ? 'gap-1' : 'gap-1.5'
    }`}
  >
    {options.map((option) => {
      const Icon = option.icon;
      const selected = value === option.value;
      return (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`inline-flex items-center justify-center gap-2 rounded-[14px] px-3 py-2 text-sm font-semibold transition ${
            selected
              ? 'bg-white text-slate-950 shadow-[0_8px_18px_rgba(15,23,42,0.08)]'
              : 'text-slate-500 hover:text-slate-900'
          }`}
          title={option.label}
        >
          {Icon ? <Icon size={16} /> : null}
          {size === 'default' ? <span>{option.label}</span> : null}
        </button>
      );
    })}
  </div>
);

export default SegmentedToggle;
