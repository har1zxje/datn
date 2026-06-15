import React from 'react';
import { Download, Loader2 } from 'lucide-react';

const EMPTY_VALUE = '—';

const formatDateTime = (value) => {
  if (!value) return EMPTY_VALUE;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? EMPTY_VALUE : parsed.toLocaleString('vi-VN');
};

const formatFreshnessResult = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'fresh') return 'Tươi';
  if (normalized === 'spoiled') return 'Hỏng';
  return 'Chưa rõ';
};

const formatConfidence = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return '0%';
  const percent = numeric <= 1 ? numeric * 100 : numeric;
  return `${Math.round(Math.min(percent, 100))}%`;
};

const getPredictionTone = (value) => {
  if (value === true) {
    return { tone: 'good', label: 'AI đúng' };
  }
  if (value === false) {
    return { tone: 'bad', label: 'AI sai' };
  }
  return { tone: 'warn', label: 'Chưa xác định' };
};

const badgeClass = (tone) => {
  if (tone === 'good') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (tone === 'bad') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (tone === 'warn') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-slate-200 bg-slate-50 text-slate-700';
};

const SelectField = ({ label, value, onChange, options }) => (
  <label className="space-y-2">
    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-2xl border border-[color:var(--line-strong)] bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  </label>
);

const StatCard = ({ label, value }) => (
  <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
    <p className="mt-2 text-lg font-black text-slate-950">{value}</p>
  </div>
);

const FreshnessVerificationReportsPanel = ({
  items,
  total,
  page,
  limit,
  totalPages,
  loading,
  filters,
  onFilterChange,
  onPageChange,
  onExport,
  exporting,
}) => {
  const correctCount = items.filter((item) => item.is_prediction_correct === true).length;
  const incorrectCount = items.filter((item) => item.is_prediction_correct === false).length;
  const voucherCount = items.filter((item) => item.voucher_code).length;

  return (
    <section className="space-y-6">
      <div className="rounded-[30px] border border-[color:var(--line-soft)] bg-white p-5 shadow-[var(--shadow-soft)] md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-[1.55rem] font-black tracking-tight text-slate-950">Báo cáo xác minh sau giao hàng</h2>
            <p className="mt-2 text-sm text-slate-500">
              Xem từng lượt khách hàng xác minh thực phẩm sau khi nhận đơn, đối chiếu kết quả AI và xuất toàn bộ dữ liệu thành Excel.
            </p>
          </div>

          <button
            type="button"
            onClick={onExport}
            disabled={exporting}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Xuất Excel
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Báo cáo trong trang" value={items.length} />
          <StatCard label="AI đúng" value={correctCount} />
          <StatCard label="AI sai" value={incorrectCount} />
          <StatCard label="Có voucher" value={voucherCount} />
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-[repeat(5,minmax(0,1fr))]">
          <label className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Từ ngày</span>
            <input
              type="date"
              value={filters.date_from}
              onChange={(event) => onFilterChange('date_from', event.target.value)}
              className="w-full rounded-2xl border border-[color:var(--line-strong)] bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
            />
          </label>

          <label className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Đến ngày</span>
            <input
              type="date"
              value={filters.date_to}
              onChange={(event) => onFilterChange('date_to', event.target.value)}
              className="w-full rounded-2xl border border-[color:var(--line-strong)] bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
            />
          </label>

          <SelectField
            label="AI đúng/sai"
            value={filters.prediction_correct}
            onChange={(value) => onFilterChange('prediction_correct', value)}
            options={[
              { value: 'all', label: 'Tất cả' },
              { value: 'correct', label: 'AI đúng' },
              { value: 'incorrect', label: 'AI sai' },
            ]}
          />

          <SelectField
            label="Kết quả đúng"
            value={filters.correct_result}
            onChange={(value) => onFilterChange('correct_result', value)}
            options={[
              { value: 'all', label: 'Tất cả' },
              { value: 'fresh', label: 'Tươi' },
              { value: 'spoiled', label: 'Hỏng' },
            ]}
          />

          <SelectField
            label="Voucher"
            value={filters.has_voucher}
            onChange={(value) => onFilterChange('has_voucher', value)}
            options={[
              { value: 'all', label: 'Tất cả' },
              { value: 'yes', label: 'Có voucher' },
              { value: 'no', label: 'Không voucher' },
            ]}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[30px] border border-[color:var(--line-soft)] bg-white shadow-[var(--shadow-soft)]">
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-4 font-black">STT</th>
                <th className="px-4 py-4 font-black">Ảnh</th>
                <th className="px-4 py-4 font-black">Đơn hàng</th>
                <th className="px-4 py-4 font-black">Sản phẩm</th>
                <th className="px-4 py-4 font-black">AI dự đoán</th>
                <th className="px-4 py-4 font-black">Khách xác nhận</th>
                <th className="px-4 py-4 font-black">Điểm / Voucher</th>
                <th className="px-4 py-4 font-black">Người gửi</th>
                <th className="px-4 py-4 font-black">Ngày gửi</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                    <Loader2 size={18} className="mx-auto mb-3 animate-spin text-emerald-600" />
                    Đang tải báo cáo xác minh sau giao hàng...
                  </td>
                </tr>
              ) : null}

              {!loading && items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                    Không có báo cáo phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : null}

              {items.map((item, index) => {
                const verdict = getPredictionTone(item.is_prediction_correct);
                const pageSize = Number(limit || items.length || 0);
                const rowNumber = (page - 1) * pageSize + index + 1;

                return (
                  <tr key={item.id} className="border-t border-slate-100 align-top transition hover:bg-slate-50/70">
                    <td className="px-4 py-4 font-bold text-slate-600">{rowNumber}</td>
                    <td className="px-4 py-4">
                      {item.image_url ? (
                        <a href={item.image_url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl border border-slate-200">
                          <img src={item.image_url} alt={item.product_name} className="h-16 w-16 object-cover" />
                        </a>
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                          Không ảnh
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-950">{item.order_number || `Đơn #${item.order_id}`}</p>
                      <p className="mt-1 text-xs text-slate-500">Đơn #{item.order_id} · Item #{item.order_item_id}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-950">{item.product_name || EMPTY_VALUE}</p>
                      <p className="mt-1 text-xs text-slate-500">Sản phẩm #{item.product_id}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-950">{item.predicted_label || EMPTY_VALUE}</p>
                      <p className="mt-1 text-slate-600">{formatFreshnessResult(item.predicted_result)}</p>
                      <p className="mt-1 text-xs text-slate-500">Độ tin cậy: {formatConfidence(item.confidence)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${badgeClass(verdict.tone)}`}>
                        {verdict.label}
                      </span>
                      <p className="mt-2 font-semibold text-slate-950">{item.correct_label || EMPTY_VALUE}</p>
                      <p className="mt-1 text-slate-600">{formatFreshnessResult(item.correct_result)}</p>
                      <p className="mt-2 text-xs text-slate-500">{item.manual_note || 'Không có ghi chú từ khách hàng.'}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-emerald-700">+{Number(item.reward_points || 0)}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.voucher_code || 'Không có voucher'}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-950">{item.user?.full_name || item.user?.username || 'Ẩn danh'}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.user?.email || 'Không có email'}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{formatDateTime(item.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-[color:var(--line-soft)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Tổng <span className="font-semibold text-slate-900">{total}</span> báo cáo, trang {page}/{totalPages}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="rounded-2xl border border-[color:var(--line-strong)] px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Trước
              </button>
              <button
                type="button"
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="rounded-2xl border border-[color:var(--line-strong)] px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default FreshnessVerificationReportsPanel;
