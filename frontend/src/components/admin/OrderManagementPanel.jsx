import React, { Fragment, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  Filter,
  Loader2,
  MapPin,
  Phone,
  RefreshCcw,
  Search,
  Trash2,
  User,
  X,
} from 'lucide-react';
import {
  bulkUpdateOrderStatus,
  deleteOrder,
  getAdminOrdersPage,
  getOrderDetail,
  isRequestCanceled,
  normalizeOrderStatus,
  normalizeOrderStatusValue,
  updateOrderStatus,
} from '../../services/api';
import { safeText } from '../../utils/text';

const PAGE_SIZE = 12;
const DEFAULT_FILTERS = {
  search: '',
  status: 'all',
  payment_method: 'all',
  date_from: '',
  date_to: '',
};

const ORDER_STATUSES = [
  ['pending', 'Chờ xác nhận'],
  ['confirmed', 'Đã xác nhận'],
  ['shipped', 'Đang giao'],
  ['delivered', 'Đã giao'],
  ['cancelled', 'Đã hủy'],
];

const PAYMENT_OPTIONS = [
  ['all', 'Tất cả thanh toán'],
  ['cod', 'COD'],
  ['card', 'Thẻ'],
  ['bank_transfer', 'Chuyển khoản'],
];

const STATUS_THEMES = {
  pending: {
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
    line: 'bg-amber-300',
  },
  confirmed: {
    badge: 'border-sky-200 bg-sky-50 text-sky-700',
    dot: 'bg-sky-500',
    line: 'bg-sky-300',
  },
  shipped: {
    badge: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    dot: 'bg-indigo-500',
    line: 'bg-indigo-300',
  },
  delivered: {
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
    line: 'bg-emerald-300',
  },
  cancelled: {
    badge: 'border-rose-200 bg-rose-50 text-rose-700',
    dot: 'bg-rose-500',
    line: 'bg-rose-300',
  },
  returned: {
    badge: 'border-slate-200 bg-slate-100 text-slate-700',
    dot: 'bg-slate-500',
    line: 'bg-slate-300',
  },
  default: {
    badge: 'border-slate-200 bg-slate-50 text-slate-700',
    dot: 'bg-slate-400',
    line: 'bg-slate-200',
  },
};

const PROGRESS_STEPS = ['pending', 'confirmed', 'shipped', 'delivered'];

const inputClass =
  'w-full rounded-2xl border border-[color:var(--line-strong)] bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100';

const formatVndValue = (value) => Number(value || 0).toLocaleString('vi-VN');

const formatDateTime = (value) => {
  if (!value) return 'Chưa có';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Chưa có' : parsed.toLocaleString('vi-VN');
};

const getPaymentLabel = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  const labels = {
    cod: 'COD',
    card: 'Thẻ',
    bank_transfer: 'Chuyển khoản',
  };
  return labels[normalized] || safeText(value, 'Chưa rõ');
};

const getPaymentBadgeClass = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'cod') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (normalized === 'card') return 'border-sky-200 bg-sky-50 text-sky-700';
  if (normalized === 'bank_transfer') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
};

const getStatusTheme = (status) => STATUS_THEMES[normalizeOrderStatusValue(status)] || STATUS_THEMES.default;

const OrderStatusBadge = ({ status }) => {
  const normalizedStatus = normalizeOrderStatusValue(status);
  const theme = getStatusTheme(normalizedStatus);
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${theme.badge}`}>
      <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
      {normalizeOrderStatus(normalizedStatus)}
    </span>
  );
};

const OrderStatusProgress = ({ status, compact = false }) => {
  const normalizedStatus = normalizeOrderStatusValue(status);
  const activeIndex = PROGRESS_STEPS.indexOf(normalizedStatus);
  const isCancelled = normalizedStatus === 'cancelled';
  const theme = getStatusTheme(normalizedStatus);

  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      <div className="flex items-center gap-1.5">
        {PROGRESS_STEPS.map((step, index) => {
          const reached = !isCancelled && activeIndex >= index;
          const dotClass = isCancelled
            ? index === 0
              ? 'bg-rose-500'
              : 'bg-slate-200'
            : reached
              ? theme.dot
              : 'bg-slate-200';
          const lineClass = isCancelled
            ? 'bg-slate-200'
            : activeIndex > index
              ? theme.line
              : 'bg-slate-200';

          return (
            <Fragment key={step}>
              <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
              {index < PROGRESS_STEPS.length - 1 ? <span className={`h-px flex-1 ${lineClass}`} /> : null}
            </Fragment>
          );
        })}
      </div>
      {!compact && (
        <div className="grid grid-cols-4 gap-2 text-[11px] font-medium text-slate-400">
          {PROGRESS_STEPS.map((step, index) => {
            const reached = !isCancelled && activeIndex >= index;
            return (
              <span key={step} className={reached ? 'text-slate-700' : ''}>
                {normalizeOrderStatus(step)}
              </span>
            );
          })}
        </div>
      )}
      {isCancelled ? <p className="text-[11px] font-semibold text-rose-600">Đơn hàng đã bị hủy.</p> : null}
    </div>
  );
};

const OrderManagementPanel = ({ active, refreshNonce, canDeleteOrders }) => {
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    total_pages: 1,
    has_next: false,
    status_counts: {},
  });
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('confirmed');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [orderDetail, setOrderDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const selectedOrderSet = useMemo(() => new Set(selectedOrderIds), [selectedOrderIds]);
  const visibleOrderIds = useMemo(() => orders.map((order) => order.id), [orders]);
  const allVisibleSelected = visibleOrderIds.length > 0 && visibleOrderIds.every((orderId) => selectedOrderSet.has(orderId));

  const orderSummaryTabs = useMemo(
    () => [
      { key: 'all', label: 'Tat ca', value: meta.total },
      ...ORDER_STATUSES.map(([value, label]) => ({
        key: value,
        label,
        value: Number(meta.status_counts?.[value] || 0),
      })),
    ],
    [meta.status_counts, meta.total],
  );

  const resolveErrorMessage = (error, fallback) => {
    if (isRequestCanceled(error)) return '';
    return safeText(error?.detail || error?.message, fallback);
  };

  const loadOrders = async ({
    page = meta.page || 1,
    nextFilters = filters,
    manageLoading = true,
  } = {}) => {
    if (manageLoading) {
      setLoading(true);
      setMessage(null);
    }

    try {
      const payload = await getAdminOrdersPage({
        page,
        limit: PAGE_SIZE,
        ...(nextFilters.search ? { search: nextFilters.search.trim() } : {}),
        ...(nextFilters.status && nextFilters.status !== 'all' ? { status: nextFilters.status } : {}),
        ...(nextFilters.payment_method && nextFilters.payment_method !== 'all' ? { payment_method: nextFilters.payment_method } : {}),
        ...(nextFilters.date_from ? { date_from: nextFilters.date_from } : {}),
        ...(nextFilters.date_to ? { date_to: nextFilters.date_to } : {}),
      });

      setOrders(payload.items);
      setMeta({
        total: payload.total,
        page: payload.page,
        limit: payload.limit || PAGE_SIZE,
        total_pages: payload.total_pages || 1,
        has_next: payload.has_next,
        status_counts: payload.status_counts || {},
      });
      setFilters(nextFilters);
      setSelectedOrderIds([]);
      return payload;
    } catch (error) {
      setMessage({ type: 'error', text: resolveErrorMessage(error, 'Không thể tải danh sách đơn hàng.') });
      return null;
    } finally {
      if (manageLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (!active) return;
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, refreshNonce]);

  const handleApplyFilters = async (event) => {
    event.preventDefault();
    if (draftFilters.date_from && draftFilters.date_to && draftFilters.date_from > draftFilters.date_to) {
      setMessage({ type: 'error', text: 'Ngày bắt đầu không được lớn hơn ngày kết thúc.' });
      return;
    }
    await loadOrders({ page: 1, nextFilters: draftFilters });
  };

  const handleResetFilters = async () => {
    setDraftFilters(DEFAULT_FILTERS);
    await loadOrders({ page: 1, nextFilters: DEFAULT_FILTERS });
  };

  const handleQuickStatusFilter = async (status) => {
    const nextFilters = { ...draftFilters, status };
    setDraftFilters(nextFilters);
    await loadOrders({ page: 1, nextFilters });
  };

  const toggleSelectOrder = (orderId) => {
    setSelectedOrderIds((prev) => (
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    ));
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedOrderIds((prev) => prev.filter((orderId) => !visibleOrderIds.includes(orderId)));
      return;
    }

    setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...visibleOrderIds])));
  };

  const openOrderDetail = async (orderId) => {
    setDrawerOpen(true);
    setDetailLoading(true);
    setOrderDetail(null);
    try {
      const detail = await getOrderDetail(orderId);
      setOrderDetail(detail);
    } catch (error) {
      setMessage({ type: 'error', text: resolveErrorMessage(error, 'Không thể tải chi tiết đơn hàng.') });
      setDrawerOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setOrderDetail(null);
  };

  const handleSingleStatusUpdate = async (orderId, nextStatus) => {
    setLoading(true);
    setMessage(null);
    try {
      await updateOrderStatus(orderId, nextStatus);
      if (orderDetail?.id === orderId) {
        setOrderDetail((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      }
      await loadOrders({ page: meta.page, manageLoading: false });
      setMessage({ type: 'success', text: 'Đã cập nhật trạng thái đơn hàng.' });
    } catch (error) {
      setMessage({ type: 'error', text: resolveErrorMessage(error, 'Không thể cập nhật trạng thái đơn hàng.') });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (selectedOrderIds.length === 0) {
      setMessage({ type: 'error', text: 'Hãy chọn ít nhất một đơn hàng để cập nhật hàng loạt.' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const result = await bulkUpdateOrderStatus(selectedOrderIds, bulkStatus);
      if (orderDetail && selectedOrderIds.includes(orderDetail.id)) {
        setOrderDetail((prev) => (prev ? { ...prev, status: bulkStatus } : prev));
      }
      await loadOrders({ page: meta.page, manageLoading: false });
      setMessage({
        type: 'success',
        text: `Đã cập nhật ${result.updated_count || selectedOrderIds.length} đơn sang "${normalizeOrderStatus(bulkStatus)}".`,
      });
    } catch (error) {
      setMessage({ type: 'error', text: resolveErrorMessage(error, 'Không thể cập nhật trạng thái hàng loạt.') });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm(`Xóa đơn hàng #${orderId}?`)) return;

    setLoading(true);
    setMessage(null);
    try {
      await deleteOrder(orderId);
      if (orderDetail?.id === orderId) closeDrawer();
      const nextPage = orders.length === 1 && meta.page > 1 ? meta.page - 1 : meta.page;
      await loadOrders({ page: nextPage, manageLoading: false });
      setMessage({ type: 'success', text: 'Đã xóa đơn hàng.' });
    } catch (error) {
      setMessage({ type: 'error', text: resolveErrorMessage(error, 'Không thể xóa đơn hàng.') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6 pb-24">
      <div className="overflow-hidden rounded-[28px] border border-[color:var(--line-soft)] bg-white shadow-[var(--shadow-soft)]">
        <div className="border-b border-[color:var(--line-soft)] px-5 py-5 md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Danh sách đơn hàng</h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFiltersOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--line-strong)] bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Filter size={16} />
                {filtersOpen ? 'Ẩn lọc' : 'Lọc'}
              </button>
              <button
                type="button"
                onClick={() => loadOrders()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--line-strong)] bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCcw size={16} />}
                Làm mới
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto px-4 pt-3 md:px-6">
          <div className="flex min-w-max gap-5 border-b border-slate-200">
            {orderSummaryTabs.map((item) => {
              const isActive = filters.status === item.key || (item.key === 'all' && filters.status === 'all');
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleQuickStatusFilter(item.key)}
                  className={`flex min-w-[112px] flex-col gap-1 border-b-[3px] px-1 pb-3 pt-1 text-left transition ${
                    isActive
                      ? 'border-emerald-600 text-slate-950'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <span className="text-sm font-semibold">{item.label}</span>
                  <span className="text-2xl font-semibold">{item.value}</span>
                </button>
              );
            })}
          </div>
        </div>

        {filtersOpen ? (
          <form
            onSubmit={handleApplyFilters}
            className="grid gap-4 px-5 py-5 md:px-6 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.45fr)_auto_auto]"
          >
            <label className="space-y-2 xl:max-w-none">
              <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Tìm kiếm</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  value={draftFilters.search}
                  onChange={(event) => setDraftFilters((prev) => ({ ...prev, search: event.target.value }))}
                  className={`${inputClass} pl-10`}
                  placeholder="Mã đơn, tên khách hàng hoặc Email"
                />
              </div>
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Trạng thái</span>
              <select
                value={draftFilters.status}
                onChange={(event) => setDraftFilters((prev) => ({ ...prev, status: event.target.value }))}
                className={inputClass}
              >
                <option value="all">Tất cả trạng thái</option>
                {ORDER_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Thanh toán</span>
              <select
                value={draftFilters.payment_method}
                onChange={(event) => setDraftFilters((prev) => ({ ...prev, payment_method: event.target.value }))}
                className={inputClass}
              >
                {PAYMENT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>

            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Khoảng ngày</span>
              <div className="overflow-hidden rounded-2xl border border-[color:var(--line-strong)] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                <div className="grid grid-cols-2 divide-x divide-slate-200">
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="date"
                      value={draftFilters.date_from}
                      onChange={(event) => setDraftFilters((prev) => ({ ...prev, date_from: event.target.value }))}
                      className="w-full border-0 bg-transparent py-3 pl-10 pr-3 text-sm font-semibold text-slate-900 outline-none"
                    />
                  </div>
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="date"
                      value={draftFilters.date_to}
                      onChange={(event) => setDraftFilters((prev) => ({ ...prev, date_to: event.target.value }))}
                      className="w-full border-0 bg-transparent py-3 pl-10 pr-3 text-sm font-semibold text-slate-900 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 self-end rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(5,150,105,0.22)] transition hover:bg-emerald-700 disabled:opacity-60"
            >
              <Filter size={16} />
              Áp dụng
            </button>

            <button
              type="button"
              onClick={handleResetFilters}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 self-end rounded-2xl border border-[color:var(--line-strong)] bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Đặt lại
            </button>
          </form>
        ) : null}
      </div>

      {message?.text ? (
        <div className={`rounded-[24px] border px-4 py-3 text-sm font-semibold ${
          message.type === 'error'
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
        }`}>
          {message.text}
        </div>
      ) : null}

      <div className="space-y-4 md:hidden">
        {loading && orders.length === 0 ? (
          <div className="rounded-[28px] border border-[color:var(--line-soft)] bg-white p-8 text-center text-sm text-slate-500 shadow-[var(--shadow-soft)]">
            <Loader2 className="mx-auto animate-spin text-emerald-600" size={22} />
            <p className="mt-3">Đang tải danh sách đơn hàng...</p>
          </div>
        ) : null}

        {orders.map((order) => (
          <article
            key={order.id}
            className={`rounded-[24px] border bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)] ${
              selectedOrderSet.has(order.id) ? 'border-emerald-300 bg-emerald-50/30' : 'border-[color:var(--line-soft)]'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selectedOrderSet.has(order.id)}
                onChange={() => toggleSelectOrder(order.id)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-black text-slate-950">{order.order_number || `#${order.id}`}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDateTime(order.created_at)}</p>
                  </div>
                  <p className="text-right text-lg font-black text-emerald-700">{formatVndValue(order.total)} d</p>
                </div>

                <div className="mt-4 grid gap-3 rounded-[20px] bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{order.customerName}</p>
                      <p className="truncate text-sm text-slate-500">{order.customerEmail || 'Không có email'}</p>
                    </div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPaymentBadgeClass(order.payment_method)}`}>
                      {getPaymentLabel(order.payment_method)}
                    </span>
                  </div>

                  <OrderStatusBadge status={order.status} />
                  <OrderStatusProgress status={order.status} compact />
                </div>

                <div className="mt-4 space-y-3">
                  <select
                    value={order.status}
                    onChange={(event) => handleSingleStatusUpdate(order.id, event.target.value)}
                    disabled={loading}
                    className={inputClass}
                  >
                    {ORDER_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => openOrderDetail(order.id)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Eye size={16} />
                      Chi tiết
                    </button>
                    {canDeleteOrders ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteOrder(order.id)}
                        className="inline-flex items-center justify-center rounded-2xl border border-rose-200 px-4 py-3 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-[28px] border border-[color:var(--line-soft)] bg-white shadow-[var(--shadow-soft)] md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px]">
            <thead className="bg-slate-50 text-left text-sm text-slate-500">
              <tr>
                <th className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
                <th className="px-4 py-4">Đơn hàng</th>
                <th className="px-4 py-4">Khách hàng</th>
                <th className="px-4 py-4">Thanh toán</th>
                <th className="px-4 py-4">Tổng tiền</th>
                <th className="px-4 py-4">Trạng thái</th>
                <th className="px-4 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {orders.map((order) => (
                <tr key={order.id} className={selectedOrderSet.has(order.id) ? 'bg-emerald-50/35' : 'hover:bg-slate-50'}>
                  <td className="px-4 py-4 align-top">
                    <input
                      type="checkbox"
                      checked={selectedOrderSet.has(order.id)}
                      onChange={() => toggleSelectOrder(order.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-4 py-4 align-top">
                    <p className="font-mono text-sm font-black text-slate-950">{order.order_number || `#${order.id}`}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDateTime(order.created_at)}</p>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <p className="font-semibold text-slate-900">{order.customerName}</p>
                    <p className="mt-1 text-xs text-slate-500">{order.customerEmail || 'Không có email'}</p>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPaymentBadgeClass(order.payment_method)}`}>
                      {getPaymentLabel(order.payment_method)}
                    </span>
                    <p className="mt-2 text-xs text-slate-500">{safeText(order.shipping_city, 'Chưa có địa chỉ')}</p>
                  </td>
                  <td className="px-4 py-4 align-top text-base font-black text-emerald-700">
                    {formatVndValue(order.total)} d
                  </td>
                  <td className="px-4 py-4 align-top">
                    <OrderStatusBadge status={order.status} />
                    <div className="mt-3 hidden xl:block">
                      <OrderStatusProgress status={order.status} />
                    </div>
                    <select
                      value={order.status}
                      onChange={(event) => handleSingleStatusUpdate(order.id, event.target.value)}
                      disabled={loading}
                      className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    >
                      {ORDER_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openOrderDetail(order.id)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Eye size={16} />
                        Chi tiết
                      </button>
                      {canDeleteOrders ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteOrder(order.id)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 size={16} />
                          Xóa
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && orders.length === 0 ? (
        <div className="rounded-[28px] border border-[color:var(--line-soft)] bg-white p-10 text-center shadow-[var(--shadow-soft)]">
          <Search size={22} className="mx-auto text-slate-400" />
          <p className="mt-4 text-base font-bold text-slate-900">Không tìm thấy đơn hàng phù hợp</p>
          <p className="mt-2 text-sm text-slate-500">Thử thay đổi bộ lọc hoặc tìm kiếm bằng mã đơn và tên khách hàng.</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 rounded-[24px] border border-[color:var(--line-soft)] bg-white px-5 py-4 shadow-[var(--shadow-soft)] md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Trang {meta.page}/{meta.total_pages || 1}</p>
          <p className="text-xs text-slate-500">Mỗi trang hiển thị tối đa {meta.limit} đơn hàng.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadOrders({ page: Math.max(1, meta.page - 1) })}
            disabled={loading || meta.page <= 1}
            className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--line-strong)] px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <ChevronLeft size={16} />
            Trước
          </button>
          <button
            type="button"
            onClick={() => loadOrders({ page: Math.min(meta.total_pages || 1, meta.page + 1) })}
            disabled={loading || meta.page >= (meta.total_pages || 1)}
            className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--line-strong)] px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Sau
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div
        className={`pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 transition-all duration-200 ${
          selectedOrderIds.length > 0 ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        }`}
      >
        <div className="pointer-events-auto flex w-full max-w-3xl flex-col gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-900">
            Đang chọn <span className="font-black text-emerald-700">{selectedOrderIds.length}</span> đơn
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={bulkStatus}
              onChange={(event) => setBulkStatus(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            >
              {ORDER_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button
              type="button"
              onClick={handleBulkStatusUpdate}
              disabled={loading || selectedOrderIds.length === 0}
              className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(5,150,105,0.22)] transition hover:bg-emerald-700 disabled:opacity-60"
            >
              Cập nhật
            </button>
          </div>
        </div>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-[90] bg-slate-950/45 backdrop-blur-sm">
          <button type="button" aria-label="Đóng chi tiết đơn hàng" className="absolute inset-0 h-full w-full cursor-default" onClick={closeDrawer} />
          <aside className="absolute inset-x-0 bottom-0 top-auto max-h-[90vh] overflow-auto rounded-t-[32px] border border-white/70 bg-[rgba(255,255,255,0.98)] p-5 shadow-[var(--shadow-overlay)] md:inset-y-0 md:right-0 md:left-auto md:h-full md:w-[580px] md:rounded-none md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chi tiết đơn hàng</p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">
                  {orderDetail?.order_number || (detailLoading ? 'Đang tải...' : 'Đơn hàng')}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {orderDetail ? formatDateTime(orderDetail.created_at) : 'Kiểm tra thông tin khách hàng và trạng thái giao hàng.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-16 text-center text-sm text-slate-500">
                <Loader2 className="mx-auto animate-spin text-emerald-600" size={22} />
                <p className="mt-3">Đang tải chi tiết đơn hàng...</p>
              </div>
            ) : orderDetail ? (
              <div className="mt-6 space-y-6">
                <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                  <OrderStatusBadge status={orderDetail.status} />
                  <div className="mt-4">
                    <OrderStatusProgress status={orderDetail.status} />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Khách hàng</p>
                    <div className="mt-3 space-y-3 text-sm text-slate-700">
                      <p className="flex items-start gap-2"><User size={16} className="mt-0.5 text-slate-400" /> <span>{orderDetail.customerName}</span></p>
                      <p className="flex items-start gap-2"><Phone size={16} className="mt-0.5 text-slate-400" /> <span>{orderDetail.shipping_phone || 'Chưa có số điện thoại'}</span></p>
                      <p className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 text-slate-400" /> <span>{safeText(orderDetail.shipping_address, 'Chưa có địa chỉ')}, {safeText(orderDetail.shipping_city, 'Chưa có thành phố')}</span></p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Thanh toán</p>
                    <div className="mt-3 space-y-3 text-sm text-slate-700">
                      <p className="flex items-start gap-2"><CreditCard size={16} className="mt-0.5 text-slate-400" /> <span>{getPaymentLabel(orderDetail.payment_method)}</span></p>
                      <p className="flex items-start gap-2"><Calendar size={16} className="mt-0.5 text-slate-400" /> <span>Gửi hàng: {formatDateTime(orderDetail.shipped_at)}</span></p>
                      <p className="flex items-start gap-2"><Calendar size={16} className="mt-0.5 text-slate-400" /> <span>Giao hàng: {formatDateTime(orderDetail.delivered_at)}</span></p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-100 bg-white p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Điều chỉnh trạng thái</p>
                      <p className="mt-1 text-sm text-slate-500">Cập nhật nhanh mà không cần rời khỏi màn hình hiện tại.</p>
                    </div>
                    <div className="flex w-full gap-3 sm:w-auto">
                      <select
                        value={orderDetail.status}
                        onChange={(event) => handleSingleStatusUpdate(orderDetail.id, event.target.value)}
                        disabled={loading}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 sm:w-[220px]"
                      >
                        {ORDER_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-100 bg-white p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-slate-950">Sản phẩm trong đơn</p>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{orderDetail.items.length} mục</p>
                  </div>
                  <div className="mt-4 space-y-3">
                    {orderDetail.items.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{item.product_name}</p>
                            <p className="mt-1 text-xs text-slate-500">Don gia: {formatVndValue(item.price_at_purchase)} d</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-900">x{item.quantity}</p>
                            <p className="mt-1 text-sm font-black text-emerald-700">{formatVndValue(item.subtotal)} d</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-100 bg-white p-5">
                  <p className="text-sm font-bold text-slate-950">Tổng kết thanh toán</p>
                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    <div className="flex items-center justify-between"><span>Tạm tính</span><span>{formatVndValue(orderDetail.subtotal)} đ</span></div>
                    <div className="flex items-center justify-between"><span>Thuế</span><span>{formatVndValue(orderDetail.tax)} đ</span></div>
                    <div className="flex items-center justify-between"><span>Phí vận chuyển</span><span>{formatVndValue(orderDetail.shipping_fee)} đ</span></div>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-base font-black text-slate-950"><span>Tổng cộng</span><span>{formatVndValue(orderDetail.total)} đ</span></div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-100 bg-white p-5">
                  <p className="text-sm font-bold text-slate-950">Ghi chú</p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{safeText(orderDetail.notes, 'Không có ghi chú từ khách hàng.')}</p>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </section>
  );
};

export default OrderManagementPanel;
