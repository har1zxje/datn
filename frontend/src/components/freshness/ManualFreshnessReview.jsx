import React from 'react';
import { ClipboardPenLine } from 'lucide-react';

const OPTIONS = [
  { value: 'good', label: 'Tuoi tot', hint: 'San pham dat ky vong va co the dung binh thuong.' },
  { value: 'normal', label: 'Binh thuong', hint: 'San pham chap nhan duoc nhung nen dung som.' },
  { value: 'poor', label: 'Kem tuoi', hint: 'San pham khong dat ky vong, can ghi chu them neu can.' },
];

const ManualFreshnessReview = ({
  rating,
  note,
  title = 'Danh gia thu cong',
  description = 'Dung khi san pham chua duoc AI ho tro hoac can thay the ket qua AI.',
  onRatingChange,
  onNoteChange,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
        <ClipboardPenLine size={18} />
      </span>
      <div>
        <p className="text-sm font-black text-slate-950">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
    </div>

    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      {OPTIONS.map((option) => {
        const active = rating === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onRatingChange(option.value)}
            className={`rounded-2xl border px-4 py-4 text-left transition ${
              active
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
            }`}
          >
            <p className="text-sm font-black">{option.label}</p>
            <p className="mt-2 text-xs leading-5 opacity-80">{option.hint}</p>
          </button>
        );
      })}
    </div>

    <label className="mt-4 block">
      <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Ghi chu tuy chon</span>
      <textarea
        value={note}
        onChange={(event) => onNoteChange(event.target.value)}
        rows={3}
        placeholder="Mo ta ngan gon tinh trang san pham neu can."
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white"
      />
    </label>
  </div>
);

export default ManualFreshnessReview;
