import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { formatCompactNumber } from '../../../utils/admin/formatters';
import { buildPaginationItems } from '../../../utils/admin/stockHelpers';
import { PRODUCT_PAGE_SIZE_OPTIONS } from '../../../constants/adminDashboard';

const NumericPaginationBar = ({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'sản phẩm',
}) => {
  if (!total || totalPages <= 1) return null;

  const items = buildPaginationItems(page, totalPages);

  return (
    <div className="sticky bottom-3 z-20 mt-5 rounded-[24px] border border-slate-200 bg-[rgba(255,255,255,0.96)] px-4 py-3 shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span>
            Tổng <span className="font-bold text-slate-950">{formatCompactNumber(total)}</span>{' '}
            {itemLabel}
          </span>
          <label className="inline-flex items-center gap-2">
            <span className="text-slate-500">Hiển thị:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none"
            >
              {PRODUCT_PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / trang
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="inline-flex h-10 min-w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-45"
            aria-label="Trang trước"
          >
            <ChevronLeft size={16} />
          </button>

          {items.map((item) =>
            typeof item === 'string' ? (
              <span
                key={item}
                className="inline-flex h-10 min-w-10 items-center justify-center rounded-2xl text-slate-400"
              >
                <MoreHorizontal size={16} />
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                className={`inline-flex h-10 min-w-10 items-center justify-center rounded-2xl px-3 text-sm font-bold transition ${
                  item === page
                    ? 'bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="inline-flex h-10 min-w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-45"
            aria-label="Trang sau"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NumericPaginationBar;
