import { formatCompactNumber } from '../../../utils/admin/formatters';

const PaginationControls = ({ page, totalPages, total, onPageChange }) => {
  if (!total || totalPages <= 1) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-[color:var(--line-soft)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Tổng <span className="font-semibold text-slate-900">{formatCompactNumber(total)}</span> mục,
        trang {page}/{totalPages}
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-2xl border border-[color:var(--line-strong)] px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Trước
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-2xl border border-[color:var(--line-strong)] px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Sau
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;
