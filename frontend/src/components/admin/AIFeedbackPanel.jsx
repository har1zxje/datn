import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bot,
  CheckCheck,
  Loader2,
  RefreshCcw,
  Search,
  UserRound,
} from 'lucide-react';

const STATUS_FILTERS = [
  ['all', 'Tất cả'],
  ['unread', 'Chưa đọc'],
  ['read', 'Đã đọc'],
];

const VERDICT_FILTERS = [
  ['all', 'Tất cả'],
  ['correct', 'AI đúng'],
  ['disputed', 'Người dùng phủ nhận'],
];

const formatDateTime = (value) => {
  if (!value) return 'Chưa có';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Chưa có' : parsed.toLocaleString('vi-VN');
};

const getFeedbackSummary = (feedback) => {
  const text =
    feedback.notes ||
    feedback.corrected_status ||
    (feedback.is_correct
      ? 'Người dùng xác nhận kết quả AI là đúng.'
      : `Người dùng đề nghị đổi thành "${feedback.corrected_label || 'khác'}".`);
  return text.length > 88 ? `${text.slice(0, 85)}...` : text;
};

const getFeedbackTitle = (feedback) =>
  feedback?.extra_metadata?.product_name || feedback?.corrected_label || feedback?.predicted_label || 'Sản phẩm';

const getReadBadgeClass = (feedback) =>
  feedback.is_read ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-900';

const getVerdictBadgeClass = (feedback) =>
  feedback.is_correct ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-900';

const MetricCard = ({ label, value, tone = 'slate' }) => {
  const toneClass = {
    slate: 'border-slate-200 bg-white text-slate-950',
    amber: 'border-amber-200 bg-amber-50/80 text-amber-950',
    emerald: 'border-emerald-200 bg-emerald-50/80 text-emerald-950',
    rose: 'border-rose-200 bg-rose-50/80 text-rose-950',
  };

  return (
    <article className={`flex h-20 flex-col justify-center rounded-[22px] border px-4 ${toneClass[tone] || toneClass.slate}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.16em] opacity-70">{label}</p>
      <p className="mt-2 text-[2rem] font-black leading-none">{value}</p>
    </article>
  );
};

const SegmentedControl = ({ value, options, onChange }) => (
  <div className="inline-flex flex-wrap rounded-[18px] border border-slate-200 bg-slate-100/80 p-1">
    {options.map(([optionValue, label]) => {
      const selected = value === optionValue;
      return (
        <button
          key={optionValue}
          type="button"
          onClick={() => onChange(optionValue)}
          className={`rounded-[14px] px-3 py-2 text-sm font-bold transition ${
            selected
              ? 'bg-white text-slate-950 shadow-[0_8px_18px_rgba(15,23,42,0.08)]'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          {label}
        </button>
      );
    })}
  </div>
);

const PaginationControls = ({ page, totalPages, total, onPageChange }) => {
  if (!total || totalPages <= 1) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-[color:var(--line-soft)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Tổng <span className="font-semibold text-slate-900">{total}</span> feedback, trang {page}/{totalPages}
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
  );
};

const FeedbackDetail = ({ feedback, markingId, onBack, onMarkRead }) => {
  if (!feedback) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center p-8">
        <div className="max-w-sm text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-slate-100 text-slate-400">
            <Bot size={28} />
          </div>
          <h3 className="mt-4 text-lg font-black text-slate-950">Chọn một feedback để xem chi tiết</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">Khu bên phải sẽ hiển thị ảnh scan, nhãn AI và phản hồi của người dùng sau khi bạn chọn một mục.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="mb-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 md:hidden"
            >
              <ArrowLeft size={15} />
              Quay lại
            </button>
          ) : null}
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Chi tiết feedback</p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">{getFeedbackTitle(feedback)}</h3>
          <p className="mt-1 text-sm text-slate-500">{formatDateTime(feedback.created_at)}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getVerdictBadgeClass(feedback)}`}>
            {feedback.is_correct ? 'AI đúng' : 'Cần đối chiếu'}
          </span>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getReadBadgeClass(feedback)}`}>
            {feedback.is_read ? 'Đã đọc' : 'Chưa đọc'}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-4">
          {(feedback.image_url || feedback.scan?.image_url) ? (
            <div className="overflow-hidden rounded-[26px] border border-[color:var(--line-soft)] bg-slate-50">
              <img
                src={feedback.image_url || feedback.scan?.image_url}
                alt={getFeedbackTitle(feedback)}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-[26px] border border-dashed border-slate-200 bg-slate-50 text-slate-400">
              <Bot size={26} />
            </div>
          )}

          <div className="rounded-[24px] border border-[color:var(--line-soft)] bg-slate-50/85 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Người gửi</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm">
                <UserRound size={18} />
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-950">
                  {feedback.user?.full_name || feedback.user?.username || `User #${feedback.user_id}`}
                </p>
                <p className="truncate text-xs text-slate-500">{feedback.user?.email || 'Không có email'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-[color:var(--line-soft)] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Đánh giá AI</p>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-900">Sản phẩm:</span> {getFeedbackTitle(feedback)}</p>
              <p><span className="font-semibold text-slate-900">Nhãn dự đoán:</span> {feedback.predicted_label}</p>
              <p><span className="font-semibold text-slate-900">Trạng thái:</span> {feedback.predicted_status}</p>
              <p><span className="font-semibold text-slate-900">Độ tin cậy:</span> {Number(feedback.predicted_confidence || 0).toFixed(1)}%</p>
              <p><span className="font-semibold text-slate-900">Nguồn:</span> {feedback.source}</p>
            </div>
          </div>

          <div className="rounded-[24px] border border-[color:var(--line-soft)] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Phản hồi người dùng</p>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-900">Kết luận:</span> {feedback.is_correct ? 'Đồng ý với AI' : 'Người dùng phủ nhận'}</p>
              <p><span className="font-semibold text-slate-900">Nhãn sửa:</span> {feedback.corrected_label || 'Không có'}</p>
              <p><span className="font-semibold text-slate-900">Trạng thái sửa:</span> {feedback.corrected_status || 'Không có'}</p>
              <p><span className="font-semibold text-slate-900">Đã đọc lúc:</span> {feedback.read_at ? formatDateTime(feedback.read_at) : 'Chưa đọc'}</p>
            </div>
          </div>

          <div className="rounded-[24px] border border-[color:var(--line-soft)] bg-slate-50/85 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Ghi chú đầy đủ</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {feedback.notes || 'Người dùng không để lại ghi chú bổ sung.'}
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            {!feedback.is_read ? (
              <button
                type="button"
                onClick={() => onMarkRead(feedback.id)}
                disabled={markingId === feedback.id}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {markingId === feedback.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCheck size={16} />}
                Đánh dấu đã đọc
              </button>
            ) : null}

            <button
              type="button"
              disabled
              title="Trạng thái này được xác định từ phản hồi của người dùng."
              className={`rounded-2xl px-4 py-3 text-sm font-bold ${
                feedback.is_correct
                  ? 'cursor-not-allowed border border-slate-200 bg-white text-slate-400'
                  : 'cursor-not-allowed bg-amber-100 text-amber-900'
              }`}
            >
              Đánh dấu cần đối chiếu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AIFeedbackPanel = ({
  items,
  total,
  counts,
  filter,
  verdict,
  search,
  page,
  totalPages,
  loading,
  markingId,
  onFilterChange,
  onVerdictChange,
  onSearchChange,
  onPageChange,
  onRefresh,
  onMarkRead,
}) => {
  const [selectedFeedbackId, setSelectedFeedbackId] = useState(null);

  const selectedFeedback = useMemo(
    () => items.find((feedback) => feedback.id === selectedFeedbackId) || null,
    [items, selectedFeedbackId],
  );

  useEffect(() => {
    if (!items.length) {
      setSelectedFeedbackId(null);
      return;
    }
    if (selectedFeedbackId && !items.some((feedback) => feedback.id === selectedFeedbackId)) {
      setSelectedFeedbackId(null);
    }
  }, [items, selectedFeedbackId]);

  const summary = {
    total: counts?.global_total ?? total,
    unread: counts?.global_unread_count ?? 0,
    read: counts?.global_read_count ?? 0,
    disputed: counts?.global_disputed_count ?? 0,
  };

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard tone="slate" label="Tổng phản hồi" value={summary.total} />
        <MetricCard tone="amber" label="Chưa đọc" value={summary.unread} />
        <MetricCard tone="emerald" label="Đã xử lý" value={summary.read} />
        <MetricCard tone="rose" label="Cần đối chiếu" value={summary.disputed} />
      </div>

      <div className="rounded-[30px] border border-[color:var(--line-soft)] bg-white p-5 shadow-[var(--shadow-soft)] md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-[1.55rem] font-black tracking-tight text-slate-950">Đọc và đối chiếu từng phản hồi</h2>
          </div>

          <div className="grid gap-3 xl:w-full xl:max-w-[920px] xl:grid-cols-[minmax(0,1.3fr)_auto_auto_auto]">
            <label className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Tìm feedback</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  className="w-full rounded-2xl border border-[color:var(--line-strong)] bg-white py-3 pl-10 pr-4 text-sm font-semibold text-slate-900 outline-none shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Người gửi, sản phẩm, ghi chú..."
                />
              </div>
            </label>

            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Trạng thái đọc</span>
              <SegmentedControl value={filter} options={STATUS_FILTERS} onChange={onFilterChange} />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Kết luận</span>
              <SegmentedControl value={verdict} options={VERDICT_FILTERS} onChange={onVerdictChange} />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex h-[50px] items-center justify-center gap-2 rounded-2xl border border-[color:var(--line-strong)] bg-white px-4 text-sm font-bold text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition hover:bg-slate-50"
              >
                <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                Tải lại
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="rounded-[30px] border border-[color:var(--line-soft)] bg-white p-10 text-center shadow-[var(--shadow-soft)]">
          <Loader2 size={22} className="mx-auto animate-spin text-emerald-600" />
          <p className="mt-3 text-sm font-medium text-slate-500">Đang tải AI feedback...</p>
        </div>
      ) : null}

      {!loading && items.length === 0 ? (
        <div className="rounded-[30px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-[var(--shadow-soft)]">
          <Bot size={24} className="mx-auto text-slate-400" />
          <p className="mt-4 text-base font-bold text-slate-900">Không có AI feedback phù hợp</p>
          <p className="mt-2 text-sm text-slate-500">Thử đổi bộ lọc hoặc tìm với từ khóa khác.</p>
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="overflow-hidden rounded-[30px] border border-[color:var(--line-soft)] bg-white shadow-[var(--shadow-soft)]">
          <div className="grid min-h-[620px] md:grid-cols-[minmax(320px,40%)_minmax(0,60%)]">
            <div className={`border-r border-[color:var(--line-soft)] ${selectedFeedback ? 'hidden md:block' : ''}`}>
              <div className="border-b border-[color:var(--line-soft)] px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-950">Danh sách feedback</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {total} mục
                  </span>
                </div>
              </div>

              <div className="max-h-[620px] overflow-auto p-3">
                <div className="space-y-2">
                  {items.map((feedback) => {
                    const active = feedback.id === selectedFeedbackId;
                    return (
                      <button
                        key={feedback.id}
                        type="button"
                        onClick={() => setSelectedFeedbackId(feedback.id)}
                        className={`w-full rounded-[22px] border p-4 text-left transition ${
                          active
                            ? 'border-slate-900 bg-slate-50'
                            : !feedback.is_read
                              ? 'border-amber-200 bg-amber-50/50 hover:bg-amber-50'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${!feedback.is_read ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'}`}>
                            <UserRound size={16} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-950">
                                  {feedback.user?.full_name || feedback.user?.username || `User #${feedback.user_id}`}
                                </p>
                                <p className={`mt-1 line-clamp-1 text-sm font-black text-slate-950 ${feedback.is_read ? '' : 'text-amber-950'}`}>
                                  {getFeedbackTitle(feedback)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {!feedback.is_read ? <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> : null}
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getReadBadgeClass(feedback)}`}>
                                  {feedback.is_read ? 'Đã đọc' : 'Chưa đọc'}
                                </span>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span>{formatDateTime(feedback.created_at)}</span>
                              <span className={`inline-flex rounded-full px-2.5 py-1 font-semibold ${getVerdictBadgeClass(feedback)}`}>
                                {feedback.is_correct ? 'AI đúng' : 'Cần đối chiếu'}
                              </span>
                            </div>
                            <p className="mt-3 line-clamp-1 text-sm text-slate-600">{getFeedbackSummary(feedback)}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={selectedFeedback ? 'block' : 'hidden md:block'}>
              <FeedbackDetail
                feedback={selectedFeedback}
                markingId={markingId}
                onBack={selectedFeedback ? () => setSelectedFeedbackId(null) : null}
                onMarkRead={onMarkRead}
              />
            </div>
          </div>

          <PaginationControls
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={onPageChange}
          />
        </div>
      ) : null}
    </section>
  );
};

export default AIFeedbackPanel;
