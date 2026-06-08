import React, { useMemo, useState } from 'react';
import {
  Bot,
  CheckCheck,
  Eye,
  Loader2,
  RefreshCcw,
  Search,
  TriangleAlert,
  UserRound,
  X,
} from 'lucide-react';

const FILTERS = [
  ['all', 'Tat ca'],
  ['unread', 'Chua doc'],
  ['read', 'Da doc'],
];

const formatDateTime = (value) => {
  if (!value) return 'Chua co';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Chua co' : parsed.toLocaleString('vi-VN');
};

const feedbackBadgeClass = (feedback) =>
  feedback.is_correct
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-amber-100 text-amber-800';

const extractSummary = (feedback) => {
  const text =
    feedback.notes ||
    (feedback.is_correct
      ? 'Nguoi dung xac nhan ket qua AI la dung.'
      : `Can doi chieu voi nhan "${feedback.corrected_label || 'khac'}".`);
  if (text.length <= 120) return text;
  return `${text.slice(0, 117)}...`;
};

const PaginationControls = ({ page, totalPages, total, onPageChange }) => {
  if (!total || totalPages <= 1) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-[color:var(--line-soft)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Tong <span className="font-semibold text-slate-900">{total}</span> feedback, trang {page}/{totalPages}
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-2xl border border-[color:var(--line-strong)] px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Truoc
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

const MetricCard = ({ tone, label, value, caption }) => {
  const themes = {
    slate: 'border-[color:var(--line-soft)] bg-white text-slate-950 shadow-[0_8px_24px_rgba(15,23,42,0.05)]',
    amber: 'border-amber-200 bg-amber-50/85 text-amber-950 shadow-[0_8px_24px_rgba(217,119,6,0.08)]',
    emerald: 'border-emerald-200 bg-emerald-50/85 text-emerald-950 shadow-[0_8px_24px_rgba(5,150,105,0.08)]',
    rose: 'border-rose-200 bg-rose-50/85 text-rose-950 shadow-[0_8px_24px_rgba(244,63,94,0.08)]',
  };

  return (
    <article className={`rounded-[24px] border p-4 ${themes[tone] || themes.slate}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.16em] opacity-65">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-semibold opacity-70">{caption}</p>
    </article>
  );
};

const AIFeedbackPanel = ({
  items,
  total,
  unreadCount,
  filter,
  search,
  page,
  totalPages,
  loading,
  markingId,
  onFilterChange,
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
  const flaggedOnPage = useMemo(
    () => items.filter((feedback) => !feedback.is_correct).length,
    [items],
  );
  const readCount = Math.max(total - unreadCount, 0);

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[30px] border border-[color:var(--line-soft)] bg-white shadow-[var(--shadow-soft)]">
        <div className="border-b border-[color:var(--line-soft)] bg-[linear-gradient(135deg,rgba(15,154,98,0.12),rgba(216,169,52,0.10),rgba(255,255,255,0.96))] px-5 py-6 md:px-6 md:py-7">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700">AI Feedback Desk</p>
              <h2 className="mt-2 text-[1.55rem] font-black tracking-tight text-slate-950">Phan hoi nguoi dung ve ket qua AI</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Gom toan bo feedback can doi chieu vao mot khu triage gon, de doc nhanh va mo chi tiet khi can.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[620px] xl:grid-cols-[1.4fr_1fr_auto]">
              <label className="space-y-2 sm:col-span-2 xl:col-span-1">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Tim feedback</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    className="w-full rounded-2xl border border-[color:var(--line-strong)] bg-white py-3 pl-10 pr-4 text-sm font-semibold text-slate-900 outline-none shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    placeholder="Nguoi gui, nhan, ghi chu..."
                  />
                </div>
              </label>

              <div className="flex flex-wrap items-center gap-2">
                {FILTERS.map(([value, label]) => {
                  const selected = filter === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => onFilterChange(value)}
                      className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                        selected
                          ? 'bg-slate-950 text-white shadow-[0_12px_24px_rgba(15,23,42,0.16)]'
                          : 'bg-white text-slate-600 ring-1 ring-[color:var(--line-soft)] hover:bg-slate-50'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[color:var(--line-strong)] bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition hover:bg-slate-50"
              >
                <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                Tai lai
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-4 md:p-6">
          <MetricCard tone="slate" label="Tong phan hoi" value={total} caption="Tat ca feedback da dong bo" />
          <MetricCard tone="amber" label="Chua doc" value={unreadCount} caption="Muc can xu ly uu tien" />
          <MetricCard tone="emerald" label="Da xu ly" value={readCount} caption="Da danh dau da doc" />
          <MetricCard tone="rose" label="Can doi chieu" value={flaggedOnPage} caption="Tinh tren trang hien tai" />
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="rounded-[30px] border border-[color:var(--line-soft)] bg-white p-10 text-center shadow-[var(--shadow-soft)]">
          <Loader2 size={22} className="mx-auto animate-spin text-emerald-600" />
          <p className="mt-3 text-sm font-medium text-slate-500">Dang tai AI feedback...</p>
        </div>
      ) : null}

      {!loading && items.length === 0 ? (
        <div className="rounded-[30px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-[var(--shadow-soft)]">
          <Bot size={24} className="mx-auto text-slate-400" />
          <p className="mt-4 text-base font-bold text-slate-900">Khong co AI feedback phu hop</p>
          <p className="mt-2 text-sm text-slate-500">Thu doi bo loc hoac tim kiem bang tu khoa khac.</p>
        </div>
      ) : null}

      {items.length > 0 && (
        <div className="overflow-hidden rounded-[30px] border border-[color:var(--line-soft)] bg-white shadow-[var(--shadow-soft)]">
          <div className="border-b border-[color:var(--line-soft)] px-5 py-4 md:px-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-slate-950">Danh sach feedback</p>
                <p className="text-xs font-semibold text-slate-500">Dong chua doc duoc lam noi bat, bam xem de mo toan bo chi tiet.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                <TriangleAlert size={13} />
                {flaggedOnPage} feedback can doi chieu tren trang nay
              </div>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead className="bg-slate-50/80 text-left text-sm text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Nguoi gui</th>
                    <th className="px-5 py-4">Thoi gian</th>
                    <th className="px-5 py-4">AI / Danh gia</th>
                    <th className="px-5 py-4">Tom tat</th>
                    <th className="px-5 py-4 text-right">Xem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {items.map((feedback) => (
                    <tr key={feedback.id} className={`transition ${!feedback.is_read ? 'bg-amber-50/35' : 'hover:bg-slate-50/70'}`}>
                      <td className="px-5 py-4 align-top">
                        <div className="flex items-start gap-3">
                          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                            <UserRound size={17} />
                          </span>
                          <div>
                            <p className="font-semibold text-slate-950">
                              {feedback.user?.full_name || feedback.user?.username || `User #${feedback.user_id}`}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">{feedback.user?.email || 'Khong co email'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top text-slate-500">{formatDateTime(feedback.created_at)}</td>
                      <td className="px-5 py-4 align-top">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${feedbackBadgeClass(feedback)}`}>
                              {feedback.is_correct ? 'AI dung' : 'Can dieu chinh'}
                            </span>
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                feedback.is_read ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {feedback.is_read ? 'Da doc' : 'Chua doc'}
                            </span>
                          </div>
                          <p className="font-semibold text-slate-900">
                            {feedback.predicted_label} / {feedback.predicted_status}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top text-slate-600">{extractSummary(feedback)}</td>
                      <td className="px-5 py-4 align-top">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setSelectedFeedbackId(feedback.id)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--line-strong)] bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition hover:bg-slate-50"
                          >
                            <Eye size={14} />
                            Xem
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 p-5 md:hidden">
            {items.map((feedback) => (
              <button
                key={feedback.id}
                type="button"
                onClick={() => setSelectedFeedbackId(feedback.id)}
                className={`rounded-[26px] border p-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition ${
                  feedback.is_read
                    ? 'border-slate-200 bg-white'
                    : 'border-amber-200 bg-amber-50/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-950">
                      {feedback.user?.full_name || feedback.user?.username || `User #${feedback.user_id}`}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{formatDateTime(feedback.created_at)}</p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      feedback.is_read ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {feedback.is_read ? 'Da doc' : 'Chua doc'}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${feedbackBadgeClass(feedback)}`}>
                    {feedback.is_correct ? 'AI dung' : 'Can dieu chinh'}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    {feedback.predicted_label} / {feedback.predicted_status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{extractSummary(feedback)}</p>
              </button>
            ))}
          </div>

          <PaginationControls
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={onPageChange}
          />
        </div>
      )}

      {selectedFeedback && (
        <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Dong chi tiet feedback"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={() => setSelectedFeedbackId(null)}
          />
          <aside className="absolute inset-x-0 bottom-0 top-auto max-h-[92vh] overflow-auto rounded-t-[32px] border border-white/70 bg-[rgba(255,255,255,0.98)] p-5 shadow-[var(--shadow-overlay)] md:inset-y-0 md:right-0 md:left-auto md:h-full md:w-[580px] md:rounded-none md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Chi tiet feedback</p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">{selectedFeedback.predicted_label}</h3>
                <p className="mt-1 text-sm text-slate-500">{formatDateTime(selectedFeedback.created_at)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFeedbackId(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-6">
              {(selectedFeedback.image_url || selectedFeedback.scan?.image_url) && (
                <div className="overflow-hidden rounded-[28px] border border-[color:var(--line-soft)] bg-slate-50">
                  <img
                    src={selectedFeedback.image_url || selectedFeedback.scan?.image_url}
                    alt={selectedFeedback.predicted_label}
                    className="h-64 w-full object-cover"
                  />
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[26px] border border-[color:var(--line-soft)] bg-slate-50/90 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Ket qua AI</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <p><span className="font-semibold text-slate-900">Nhan:</span> {selectedFeedback.predicted_label}</p>
                    <p><span className="font-semibold text-slate-900">Trang thai:</span> {selectedFeedback.predicted_status}</p>
                    <p><span className="font-semibold text-slate-900">Do tin cay:</span> {Number(selectedFeedback.predicted_confidence || 0).toFixed(1)}%</p>
                    <p><span className="font-semibold text-slate-900">Nguon:</span> {selectedFeedback.source}</p>
                  </div>
                </div>

                <div className="rounded-[26px] border border-[color:var(--line-soft)] bg-slate-50/90 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Danh gia nguoi dung</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <p><span className="font-semibold text-slate-900">Ket luan:</span> {selectedFeedback.is_correct ? 'Dong y voi AI' : 'Khong dong y'}</p>
                    <p><span className="font-semibold text-slate-900">Nhan sua:</span> {selectedFeedback.corrected_label || 'Khong co'}</p>
                    <p><span className="font-semibold text-slate-900">Trang thai sua:</span> {selectedFeedback.corrected_status || 'Khong co'}</p>
                    <p><span className="font-semibold text-slate-900">Da doc luc:</span> {selectedFeedback.read_at ? formatDateTime(selectedFeedback.read_at) : 'Chua doc'}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-[color:var(--line-soft)] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Nguoi gui</p>
                    <div className="mt-3 flex items-center gap-3 text-sm text-slate-700">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                        <UserRound size={16} />
                      </span>
                      <div>
                        <p className="font-semibold text-slate-950">
                          {selectedFeedback.user?.full_name || selectedFeedback.user?.username || `User #${selectedFeedback.user_id}`}
                        </p>
                        <p className="text-xs text-slate-500">{selectedFeedback.user?.email || 'Khong co email'}</p>
                      </div>
                    </div>
                  </div>

                  {!selectedFeedback.is_correct && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                      <TriangleAlert size={12} />
                      Can doi chieu ket qua AI
                    </span>
                  )}
                </div>

                <div className="mt-4 rounded-[24px] bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Ghi chu day du</p>
                  <p className="mt-2 leading-6">{selectedFeedback.notes || 'Nguoi dung khong de lai ghi chu bo sung.'}</p>
                </div>

                {!selectedFeedback.is_read && (
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onMarkRead(selectedFeedback.id)}
                      disabled={markingId === selectedFeedback.id}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      {markingId === selectedFeedback.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCheck size={16} />}
                      Danh dau da doc
                    </button>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
};

export default AIFeedbackPanel;
