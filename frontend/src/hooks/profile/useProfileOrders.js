import { useMemo, useState } from 'react';
import {
  cancelUserOrder,
  getUserOrdersPage,
  normalizeOrderStatus,
  updateUserOrder,
} from '../../services/api';
import { safeText } from '../../utils/text';
import { canModifyOrder, emptyOrderForm, VN_PHONE_REGEX } from '../../utils/profile/helpers';

const DEFAULT_PAGE_SIZE = 6;

export const useProfileOrders = (setMessage) => {
  const [orders, setOrders] = useState([]);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [orderForm, setOrderForm] = useState(emptyOrderForm);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderPhoneError, setOrderPhoneError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasNext: false,
    statusCounts: {},
  });

  const pendingOrders = useMemo(
    () => Number(pagination.statusCounts?.pending || 0),
    [pagination.statusCounts],
  );

  const deliveredOrders = useMemo(
    () => Number(pagination.statusCounts?.delivered || 0),
    [pagination.statusCounts],
  );

  const loadOrders = async (
    nextPage = pagination.page,
    nextLimit = pagination.limit,
  ) => {
    try {
      setLoadingOrders(true);
      const response = await getUserOrdersPage({ page: nextPage, limit: nextLimit });
      setOrders(response.items);
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.total_pages,
        hasNext: response.has_next,
        statusCounts: response.status_counts || {},
      });
      setExpandedOrderId(null);
      setEditingOrderId(null);
    } catch (err) {
      setMessage({
        type: 'error',
        text: safeText(err.detail, 'Không thể tải danh sách đơn hàng'),
      });
    } finally {
      setLoadingOrders(false);
    }
  };

  const startEditOrder = (order) => {
    setEditingOrderId(order.id);
    setOrderForm({
      shipping_address: order.shipping_address || '',
      shipping_city: order.shipping_city || '',
      shipping_phone: order.shipping_phone || '',
      payment_method: order.payment_method || 'cod',
      notes: order.notes || '',
    });
    setOrderPhoneError('');
  };

  const handleOrderChange = (field, value) => {
    if (field === 'shipping_phone') {
      const digits = value.replace(/\D/g, '').slice(0, 10);
      setOrderForm((prev) => ({ ...prev, shipping_phone: digits }));
      setOrderPhoneError(
        digits && !VN_PHONE_REGEX.test(digits) ? 'Số điện thoại không hợp lệ' : '',
      );
      return;
    }
    setOrderForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleOrderSubmit = async (event, order) => {
    event.preventDefault();
    if (!VN_PHONE_REGEX.test(orderForm.shipping_phone)) {
      setOrderPhoneError('Số điện thoại không hợp lệ');
      return;
    }
    setSavingOrder(true);
    setMessage(null);
    try {
      const updated = await updateUserOrder(order.id, orderForm);
      setOrders((prev) => prev.map((item) => (item.id === order.id ? updated : item)));
      setEditingOrderId(null);
      setMessage({ type: 'success', text: 'Đã cập nhật đơn hàng' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: safeText(err.detail, 'Không thể cập nhật đơn hàng'),
      });
    } finally {
      setSavingOrder(false);
    }
  };

  const handleCancelOrder = async (order) => {
    if (!window.confirm('Bạn muốn hủy đơn hàng này?')) return;
    setSavingOrder(true);
    setMessage(null);
    try {
      await cancelUserOrder(order.id);
      await loadOrders(pagination.page, pagination.limit);
      setMessage({ type: 'success', text: 'Đã hủy đơn hàng' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: safeText(err.detail, 'Không thể hủy đơn hàng'),
      });
    } finally {
      setSavingOrder(false);
    }
  };

  return {
    orders,
    editingOrderId,
    setEditingOrderId,
    orderForm,
    expandedOrderId,
    setExpandedOrderId,
    loadingOrders,
    savingOrder,
    orderPhoneError,
    pendingOrders,
    deliveredOrders,
    totalOrders: pagination.total,
    currentPage: pagination.page,
    pageSize: pagination.limit,
    totalPages: pagination.totalPages,
    hasNextPage: pagination.hasNext,
    normalizeOrderStatus,
    canModifyOrder,
    loadOrders,
    startEditOrder,
    handleOrderChange,
    handleOrderSubmit,
    handleCancelOrder,
  };
};
