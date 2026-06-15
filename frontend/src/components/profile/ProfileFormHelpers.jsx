import { Lock } from 'lucide-react';

export const inputCls = (hasError) =>
  `min-h-12 w-full rounded-[18px] border bg-white px-4 py-3 text-sm text-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.03)] outline-none transition-all focus:ring-4 ${
    hasError
      ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
      : 'border-[#E5E7EB] focus:border-[#16A34A] focus:ring-[#DCFCE7]'
  }`;

const fieldFrameCls = (hasError, disabled) =>
  `relative rounded-[20px] border px-4 pb-3 pt-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition-all focus-within:ring-4 ${
    disabled ? 'bg-[#F8FAF9]' : 'bg-white'
  } ${
    hasError
      ? 'border-rose-300 focus-within:border-rose-400 focus-within:ring-rose-100'
      : 'border-[#E5E7EB] focus-within:border-[#16A34A] focus-within:ring-[#DCFCE7]'
  }`;

export const floatingInputCls =
  'w-full border-0 bg-transparent p-0 text-[15px] font-semibold text-[#111827] outline-none placeholder:text-[#9CA3AF] disabled:cursor-not-allowed disabled:text-[#9CA3AF]';

export const FloatingField = ({ label, error, children, className = '', disabled = false }) => (
  <label className={`block ${className}`}>
    <div className={fieldFrameCls(!!error, disabled)}>
      <span className="pointer-events-none absolute left-4 top-0 -translate-y-1/2 rounded-full bg-white px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
        {label}
      </span>
      {children}
    </div>
    {error ? <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p> : null}
  </label>
);

export const LockedField = ({ label, value }) => (
  <FloatingField label={label} disabled>
    <div className="flex items-center gap-3 text-[15px] font-semibold text-[#111827]">
      <span className="min-w-0 flex-1 truncate">{value || 'Chưa cập nhật'}</span>
      <Lock size={14} className="shrink-0 text-[#9CA3AF]" />
    </div>
  </FloatingField>
);
