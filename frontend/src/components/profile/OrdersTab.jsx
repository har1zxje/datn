import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Edit3,
  Loader2,
  MapPin,
  PackageCheck,
  Save,
  ShoppingBag,
  Truck,
  Wallet,
  X,
} from 'lucide-react';
import { formatCurrency, normalizeOrderStatus } from '../../services/api';
import { canModifyOrder, formatDate, paymentLabels, STATUS_CONFIG } from '../../utils/profile/helpers';
import { FloatingField, floatingInputCls } from './ProfileFormHelpers';
import ProfileEmptyState from './ProfileEmptyState';

const PAGE_SIZE_OPTIONS = [6, 10, 20];

const buildPageItems = (page, totalPages) => {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (page <= 3) return [1, 2, 3, 'ellipsis-start', totalPages];
  if (page >= totalPages - 2) return [1, 'ellipsis-end', totalPages - 2, totalPages - 1, totalPages];
  return [1, 'ellipsis-left', page - 1, page, page + 1, 'ellipsis-right', totalPages];
};

const OrderSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 3 }).map((_, index) => (
      <div
        key={index}
        className="rounded-[28px] border border-white/80 bg-white/92 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)]"
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 animate-pulse rounded-2xl bg-slate-200" />
            <div className="space-y-3">
              <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200" />
              <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200" />
              <div className="h-4 w-64 animate-pulse rounded-full bg-slate-200" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-6 w-28 animate-pulse rounded-full bg-slate-200" />
            <div className="h-10 w-36 animate-pulse rounded-2xl bg-slate-200" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const OrdersTab = ({
  orders,
  loadingOrders,
  loadOrders,
  editingOrderId,
  setEditingOrderId,
  orderForm,
  expandedOrderId,
  setExpandedOrderId,
  savingOrder,
  orderPhoneError,
  handleOrderChange,
  handleOrderSubmit,
  handleCancelOrder,
  startEditOrder,
  totalOrders,
  currentPage,
  pageSize,
  totalPages,
}) => {
  const navigate = useNavigate();
  const pageItems = buildPageItems(currentPage, totalPages);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 rounded-[30px] border border-white/80 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-semibold text-[#166534]">
            <ShoppingBag size={14} />
            Đơn hàng
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#111827]">Theo dõi đơn nhanh, chỉnh sửa trước khi xác nhận</h2>
        </div>

        <button
          type="button"
          onClick={() => loadOrders(currentPage, pageSize)}
          disabled={loadingOrders}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-5 py-3 text-sm font-semibold text-[#111827] transition hover:bg-[#F8FAF9] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loadingOrders ? <Loader2 size={16} className="animate-spin" /> : <ClipboardList size={16} />}
          Tải lại
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-[24px] border border-white/80 bg-white/90 px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-[#4B5563]">
          Hiển thị <span className="text-[#111827]">{pageSize}</span> đơn mỗi trang
        </p>
        <label className="inline-flex items-center gap-3 text-sm font-semibold text-[#4B5563]">
          Số dòng
          <select
            value={pageSize}
            onChange={(event) => loadOrders(1, Number(event.target.value))}
            className="min-h-11 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-semibold text-[#111827] outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-[#DCFCE7]"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} / trang
              </option>
            ))}
          </select>
        </label>
      </div>

      {loadingOrders ? (
        <OrderSkeleton />
      ) : orders.length === 0 ? (
        <ProfileEmptyState
          icon={PackageCheck}
          eyebrow="Chưa có giao dịch"
          title="Đơn hàng đầu tiên của bạn sẽ xuất hiện ở đây"
          description="Sau khi hoàn tất một lần mua, bạn có thể theo dõi trạng thái, chỉnh sửa khi còn chờ xác nhận và xác minh độ tươi sau giao hàng."
          actionLabel="Tiếp tục mua sắm"
          onAction={() => navigate('/shop')}
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isEditing = editingOrderId === order.id;
            const isExpanded = expandedOrderId === order.id;
            const statusKey = String(order.status || '').toLowerCase();
            const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.returned;
            const canEditOrder = canModifyOrder(order);
            const previewItems = order.items.slice(0, 3);

            return (
              <article
                key={order.id}
                className="rounded-[28px] border border-white/80 bg-white/95 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)] transition duration-200 hover:shadow-[0_24px_55px_rgba(15,23,42,0.09)] sm:p-6"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${statusCfg.iconBg}`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${statusCfg.dot}`} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-bold tracking-tight text-[#111827]">
                            {order.order_number || `#${order.id}`}
                          </h3>
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusCfg.cls}`}>
                            {normalizeOrderStatus(order.status)}
                          </span>
                          {canEditOrder ? (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                              Có thể chỉnh sửa
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                              Đơn đã khóa
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-sm text-[#6B7280]">Đặt ngày {formatDate(order.created_at)}</p>

                        <div className="mt-4 flex flex-wrap gap-3 text-sm text-[#4B5563]">
                          <span className="inline-flex items-center gap-2 rounded-full bg-[#F8FAF9] px-3 py-2">
                            <Truck size={14} className="text-[#16A34A]" />
                            {order.shipping_phone || 'Chưa có số điện thoại'}
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full bg-[#F8FAF9] px-3 py-2">
                            <MapPin size={14} className="text-[#16A34A]" />
                            {[order.shipping_address, order.shipping_city].filter(Boolean).join(', ') || 'Chưa có địa chỉ'}
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full bg-[#F8FAF9] px-3 py-2">
                            <Wallet size={14} className="text-[#16A34A]" />
                            {paymentLabels[order.payment_method] || order.payment_method || 'Chưa có thông tin'}
                          </span>
                        </div>

                        {previewItems.length > 0 ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {previewItems.map((item) => (
                              <span key={item.id || `${order.id}-${item.product_id}`} className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-[#4B5563]">
                                {item.product_name} x{item.quantity}
                              </span>
                            ))}
                            {order.items.length > previewItems.length ? (
                              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                                +{order.items.length - previewItems.length} sản phẩm khác
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full shrink-0 flex-col gap-4 xl:w-auto xl:items-end">
                    <div className="rounded-[22px] bg-[#F8FAF9] px-4 py-3 text-left xl:text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Tổng thanh toán</p>
                      <p className="mt-1 text-2xl font-bold tracking-tight text-[#166534]">{formatCurrency(order.total)}</p>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <button
                        type="button"
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-semibold text-[#111827] transition hover:bg-[#F8FAF9]"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {isExpanded ? 'Thu gọn' : 'Chi tiết'}
                      </button>

                      {canEditOrder ? (
                        <>
                          <button
                            type="button"
                            onClick={() => startEditOrder(order)}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-semibold text-[#111827] transition hover:bg-[#F8FAF9]"
                          >
                            <Edit3 size={14} />
                            Chỉnh sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelOrder(order)}
                            disabled={savingOrder}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            <X size={14} />
                            Hủy đơn
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                {order.freshness_confirmation_available ? (
                  <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-bold text-amber-900">
                          Đơn đã giao. Chụp ảnh để xác nhận độ tươi và nhận {order.freshness_reward_points || 50} điểm.
                        </p>
                        <p className="mt-1 text-xs font-semibold text-amber-700">
                          Hạn xác nhận đến{' '}
                          {order.freshness_confirmation_expires_at
                            ? new Date(order.freshness_confirmation_expires_at).toLocaleString('vi-VN')
                            : '24 giờ sau giao hàng'}.
                        </p>
                      </div>
                      <Link
                        to={`/orders/${order.id}/confirm-freshness`}
                        className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600"
                      >
                        Xác nhận độ tươi
                      </Link>
                    </div>
                  </div>
                ) : null}

                {order.freshness_confirmation_completed ? (
                  <div className="mt-5 rounded-[24px] border border-emerald-200 bg-[#F0FDF4] px-5 py-4 text-sm font-semibold text-[#166534]">
                    Bạn đã xác nhận độ tươi cho đơn này.
                  </div>
                ) : null}

                {order.freshness_confirmation_expired ? (
                  <div className="mt-5 rounded-[24px] border border-[#E5E7EB] bg-[#F8FAF9] px-5 py-4 text-sm font-semibold text-[#4B5563]">
                    Đơn đã quá hạn 24 giờ nên không còn mở xác nhận độ tươi.
                  </div>
                ) : null}

                {isExpanded ? (
                  <div className="mt-5 overflow-hidden rounded-[24px] border border-[#E5E7EB]">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead className="bg-[#F8FAF9]">
                        <tr>
                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Sản phẩm</th>
                          <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7280]">SL</th>
                          <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Đơn giá</th>
                          <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9] bg-white">
                        {order.items.length > 0 ? (
                          order.items.map((item) => (
                            <tr key={item.id || `${order.id}-${item.product_id}`} className="hover:bg-[#F8FAF9]">
                              <td className="px-5 py-4 font-medium text-[#111827]">{item.product_name}</td>
                              <td className="px-5 py-4 text-center text-[#4B5563]">x{item.quantity}</td>
                              <td className="px-5 py-4 text-right text-[#4B5563]">{formatCurrency(item.price_at_purchase)}</td>
                              <td className="px-5 py-4 text-right font-semibold text-[#111827]">
                                {formatCurrency(item.subtotal || item.price_at_purchase * item.quantity)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-5 py-5 text-center text-sm text-[#6B7280]">
                              Không có dữ liệu sản phẩm
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot className="border-t border-[#E5E7EB] bg-[#F8FAF9]">
                        <tr>
                          <td colSpan={3} className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Tạm tính</td>
                          <td className="px-5 py-3 text-right font-semibold text-[#111827]">{formatCurrency(order.subtotal)}</td>
                        </tr>
                        {Number(order.shipping_fee) > 0 ? (
                          <tr>
                            <td colSpan={3} className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Phí vận chuyển</td>
                            <td className="px-5 py-3 text-right font-semibold text-[#111827]">{formatCurrency(order.shipping_fee)}</td>
                          </tr>
                        ) : null}
                        <tr>
                          <td colSpan={3} className="px-5 py-4 text-right text-sm font-bold text-[#111827]">Tổng cộng</td>
                          <td className="px-5 py-4 text-right text-lg font-bold text-[#166534]">{formatCurrency(order.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : null}

                {isEditing ? (
                  <form
                    onSubmit={(event) => handleOrderSubmit(event, order)}
                    className="mt-5 rounded-[26px] border border-[#BBF7D0] bg-[#FCFFFD] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.04)]"
                  >
                    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-lg font-semibold text-[#111827]">Cập nhật thông tin nhận hàng</p>
                        <p className="mt-1 text-sm text-[#6B7280]">Chỉnh sửa địa chỉ hoặc phương thức thanh toán trước khi cửa hàng xác nhận đơn.</p>
                      </div>
                      <span className="rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-semibold text-[#166534]">
                        Chỉ áp dụng cho đơn chờ xác nhận
                      </span>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <FloatingField label="Địa chỉ giao hàng">
                        <input
                          value={orderForm.shipping_address}
                          onChange={(event) => handleOrderChange('shipping_address', event.target.value)}
                          className={floatingInputCls}
                        />
                      </FloatingField>

                      <FloatingField label="Thành phố">
                        <input
                          value={orderForm.shipping_city}
                          onChange={(event) => handleOrderChange('shipping_city', event.target.value)}
                          className={floatingInputCls}
                        />
                      </FloatingField>

                      <FloatingField label="Số điện thoại" error={orderPhoneError}>
                        <input
                          type="tel"
                          value={orderForm.shipping_phone}
                          onChange={(event) => handleOrderChange('shipping_phone', event.target.value)}
                          className={floatingInputCls}
                        />
                      </FloatingField>

                      <FloatingField label="Thanh toán">
                        <select
                          value={orderForm.payment_method}
                          onChange={(event) => handleOrderChange('payment_method', event.target.value)}
                          className={floatingInputCls}
                        >
                          <option value="cod">Tiền mặt (COD)</option>
                          <option value="qr">QR Code</option>
                          <option value="bank_transfer">Chuyển khoản</option>
                        </select>
                      </FloatingField>

                      <FloatingField label="Ghi chú" className="lg:col-span-2">
                        <textarea
                          value={orderForm.notes}
                          onChange={(event) => handleOrderChange('notes', event.target.value)}
                          rows={3}
                          className={`${floatingInputCls} resize-none`}
                        />
                      </FloatingField>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingOrderId(null)}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] px-5 py-3 text-sm font-semibold text-[#111827] transition hover:bg-white"
                      >
                        <X size={16} />
                        Đóng
                      </button>
                      <button
                        type="submit"
                        disabled={savingOrder}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#16A34A] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(22,163,74,0.22)] transition hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {savingOrder ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        {savingOrder ? 'Đang lưu' : 'Lưu thay đổi'}
                      </button>
                    </div>
                  </form>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex flex-col gap-3 rounded-[24px] border border-white/80 bg-white/90 px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[#4B5563]">
            Trang <span className="text-[#111827]">{currentPage}</span> / {totalPages}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => loadOrders(Math.max(1, currentPage - 1), pageSize)}
              disabled={currentPage <= 1}
              className="inline-flex h-11 min-w-11 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#111827] transition hover:bg-[#F8FAF9] disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Trang trước"
            >
              <ChevronLeft size={16} />
            </button>

            {pageItems.map((item) =>
              typeof item === 'number' ? (
                <button
                  key={item}
                  type="button"
                  onClick={() => loadOrders(item, pageSize)}
                  className={`inline-flex h-11 min-w-11 items-center justify-center rounded-2xl px-3 text-sm font-semibold transition ${
                    item === currentPage
                      ? 'bg-[#16A34A] text-white shadow-[0_16px_36px_rgba(22,163,74,0.22)]'
                      : 'border border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F8FAF9]'
                  }`}
                >
                  {item}
                </button>
              ) : (
                <span key={item} className="px-2 text-[#9CA3AF]">
                  ...
                </span>
              ),
            )}

            <button
              type="button"
              onClick={() => loadOrders(Math.min(totalPages, currentPage + 1), pageSize)}
              disabled={currentPage >= totalPages}
              className="inline-flex h-11 min-w-11 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#111827] transition hover:bg-[#F8FAF9] disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Trang sau"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default OrdersTab;
