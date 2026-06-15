import axios from 'axios';
import { getNavigationSignal } from './navigationTasks';
import { safeText } from '../utils/text';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=300&auto=format&fit=crop';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user';
const AUTH_EXPIRED_EVENT = 'freshfood:auth-expired';
export const PRODUCT_SYNC_EVENT = 'nutrigro:product-sync';

const api = axios.create({ baseURL: API_BASE_URL });
let refreshPromise = null;
const MAX_PRODUCTS_PER_REQUEST = 100;

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

export const getStoredUser = () => {
  const savedUser = localStorage.getItem(USER_KEY);
  if (!savedUser || !getAccessToken()) return null;
  try {
    return JSON.parse(savedUser);
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
};

const notifyAuthExpired = () => {
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
};

export const saveAuthSession = ({ access_token, refresh_token, user }) => {
  if (access_token) localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
  if (refresh_token) localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearAuthSession = ({ redirect = false, notify = false } = {}) => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  if (notify) notifyAuthExpired();
  if (redirect && window.location.pathname !== '/') {
    window.location.assign('/');
  }
};

export const isRequestCanceled = (error) => {
  const detail = safeText(error?.detail).toLowerCase();
  const message = safeText(error?.message).toLowerCase();
  const code = safeText(error?.code).toUpperCase();

  return Boolean(
    error?.isCanceled ||
    axios.isCancel?.(error) ||
    code === 'ERR_CANCELED' ||
    error?.name === 'CanceledError' ||
    detail === 'canceled' ||
    message === 'canceled'
  );
};

const apiError = (error, fallback) => {
  if (isRequestCanceled(error)) {
    return { detail: 'canceled', code: 'ERR_CANCELED', isCanceled: true };
  }
  if (error?.detail) return error;
  if (error?.response?.data) return error.response.data;
  if (error?.message) return { detail: error.message };
  return { detail: fallback };
};

const refreshAuthToken = async () => {
  const refresh_token = getRefreshToken();
  if (!refresh_token) {
    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }

  const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, { refresh_token });
  saveAuthSession(response.data);
  return response.data.access_token;
};

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (!config.signal) config.signal = getNavigationSignal();
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const url = originalRequest?.url || '';
    const isAuthEndpoint =
      url.includes('/api/auth/login') ||
      url.includes('/api/auth/register') ||
      url.includes('/api/auth/refresh');

    if (status !== 401 || originalRequest?._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshAuthToken().finally(() => { refreshPromise = null; });
      }

      const newAccessToken = await refreshPromise;
      originalRequest.headers = {
        ...originalRequest.headers,
        Authorization: `Bearer ${newAccessToken}`,
      };
      return api(originalRequest);
    } catch (refreshError) {
      clearAuthSession({ redirect: true, notify: true });
      return Promise.reject(refreshError);
    }
  }
);

export const formatCurrency = (value) => {
  const number = Number(value || 0);
  return `${number.toLocaleString('vi-VN')} đ`;
};

const resolveImageUrl = (rawValue) => {
  const value = safeText(rawValue);
  if (!value) return '';
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:')) return value;
  if (value.startsWith('/')) return `${API_BASE_URL}${value}`;
  return `${API_BASE_URL}/${value}`;
};

const appendVersionQuery = (url, version) => {
  const normalizedUrl = safeText(url);
  const normalizedVersion = safeText(version);
  if (!normalizedUrl || !normalizedVersion) return normalizedUrl;
  const separator = normalizedUrl.includes('?') ? '&' : '?';
  return `${normalizedUrl}${separator}v=${encodeURIComponent(normalizedVersion)}`;
};

const normalizePaymentQr = (payload = {}) => ({
  ...payload,
  image_url: appendVersionQuery(
    resolveImageUrl(payload.image_url),
    payload.updated_at || payload.id,
  ),
});

const resolveDownloadFilename = (contentDisposition, fallback) => {
  const headerValue = safeText(contentDisposition);
  if (!headerValue) return fallback;

  const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const plainMatch = headerValue.match(/filename="?([^"]+)"?/i);
  return plainMatch?.[1] || fallback;
};

const compactQueryParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === 'string' && value.trim() === '') return false;
      return true;
    }),
  );

export const normalizeProduct = (product = {}) => {
  const basePrice = Number(product.price ?? 0);
  const discountPrice = Number(product.discount_price ?? 0);
  const hasDiscountPrice =
    Number.isFinite(discountPrice) &&
    discountPrice > 0 &&
    Number.isFinite(basePrice) &&
    basePrice > discountPrice;
  const priceNumber = hasDiscountPrice ? discountPrice : basePrice;
  const resolvedCategoryId = product.category_id || product.category?.id || null;
  const categoryName = product.category?.name || product.category_name || product.category || '';
  const resolvedSoldCount = Number(
    product.sold_count ??
      product.total_sold ??
      product.units_sold ??
      product.quantity_sold ??
      product.sales_count ??
      0
  );
  const resolvedImageUrl =
    resolveImageUrl(product.image_url) ||
    resolveImageUrl(product.img) ||
    PLACEHOLDER_IMAGE;
  const resolvedDiscountPercent = Number(
    product.discount_percent ||
      (hasDiscountPrice && basePrice > 0 ? ((basePrice - discountPrice) / basePrice) * 100 : 0)
  );

  return {
    ...product,
    name: safeText(product.name),
    description: safeText(product.description),
    price: priceNumber,
    base_price: basePrice,
    original_price: hasDiscountPrice ? basePrice : 0,
    discount_price: hasDiscountPrice ? discountPrice : 0,
    discount_percent: Number.isFinite(resolvedDiscountPercent) ? resolvedDiscountPercent : 0,
    promotion_type: safeText(product.promotion_type, 'none'),
    promotion_value: Number(product.promotion_value || 0),
    promotion_label: safeText(product.promotion_label),
    priceText: formatCurrency(priceNumber),
    img: resolvedImageUrl,
    image_url: resolvedImageUrl,
    category_id: resolvedCategoryId,
    category: safeText(categoryName, ''),
    stock: product.stock ?? product.quantity ?? 0,
    quantity: product.quantity ?? product.stock ?? 0,
    unit: product.unit || 'kg',
    stock_status: product.stock_status || ((product.quantity ?? product.stock ?? 0) > 0 ? 'in_stock' : 'out_of_stock'),
    sold_count: Number.isFinite(resolvedSoldCount) ? resolvedSoldCount : 0,
    is_featured: Boolean(product.is_featured),
    ai_supported: Boolean(product.ai_supported),
    ai_class_name: safeText(product.ai_class_name),
  };
};

export const normalizeCategory = (category = {}) => ({
  ...category,
  id: Number(category.id || 0),
  name: safeText(category.name || category.label, 'Danh mục'),
});

export const normalizeOrderStatusValue = (status) => {
  const normalized = safeText(status)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
  const aliases = {
    pending: 'pending',
    'cho xac nhan': 'pending',
    confirmed: 'confirmed',
    'da xac nhan': 'confirmed',
    shipped: 'shipped',
    'dang giao': 'shipped',
    delivered: 'delivered',
    'da giao': 'delivered',
    cancelled: 'cancelled',
    canceled: 'cancelled',
    'da huy': 'cancelled',
    returned: 'returned',
    'da tra': 'returned',
  };
  return aliases[normalized] || normalized;
};

export const normalizeOrderStatus = (status) => {
  const normalized = normalizeOrderStatusValue(status);
  const labels = {
    pending: 'Chờ xác nhận',
    'cho xac nhan': 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    'da xac nhan': 'Đã xác nhận',
    shipped: 'Đang giao',
    'dang giao': 'Đang giao',
    delivered: 'Đã giao',
    'da giao': 'Đã giao',
    cancelled: 'Đã hủy',
    'da huy': 'Đã hủy',
    returned: 'Đã trả',
    'da tra': 'Đã trả',
  };
  return labels[normalized] || safeText(status) || 'Không rõ';
};

export const normalizeOrderItem = (item = {}) => {
  const product = item.product ? normalizeProduct(item.product) : null;
  return {
    ...item,
    product,
    product_name: safeText(product?.name || item.product_name || `Sản phẩm #${item.product_id}`),
    ai_supported: Boolean(item.ai_supported ?? product?.ai_supported),
    ai_class_name: safeText(item.ai_class_name || product?.ai_class_name),
    quantity: Number(item.quantity || 0),
    price_at_purchase: Number(item.price_at_purchase || 0),
    subtotal: Number(item.subtotal || 0),
  };
};

export const normalizeOrder = (order = {}) => {
  const owner = order.owner || {};
  const customerName = safeText(order.customer_name || owner.full_name || owner.username, '');
  const customerEmail = safeText(order.customer_email || owner.email || '', '');

  return {
    ...order,
    status: normalizeOrderStatusValue(order.status?.value || order.status),
    subtotal: Number(order.subtotal || 0),
    tax: Number(order.tax || 0),
    shipping_fee: Number(order.shipping_fee || 0),
    discount: Number(order.discount || 0),
    total: Number(order.total ?? order.total_price ?? 0),
    order_type: safeText(order.order_type, 'normal'),
    replacement_parent_order_id: order.replacement_parent_order_id ?? null,
    voucher_code: safeText(order.voucher_code),
    points_redeemed: Number(order.points_redeemed || 0),
    items: Array.isArray(order.items) ? order.items.map(normalizeOrderItem) : [],
    customerName: customerName || customerEmail || 'Ẩn danh',
    customerEmail,
    freshness_reward_points: Number(order.freshness_reward_points || 50),
    freshness_confirmation_available: Boolean(order.freshness_confirmation_available),
    freshness_confirmation_completed: Boolean(order.freshness_confirmation_completed),
    freshness_confirmation_expired: Boolean(order.freshness_confirmation_expired),
    freshness_confirmation_expires_at: order.freshness_confirmation_expires_at || null,
  };
};

const normalizeOrderStatusCounts = (counts = {}) =>
  Object.entries(counts).reduce((acc, [status, count]) => {
    const normalizedStatus = normalizeOrderStatusValue(status);
    if (!normalizedStatus) return acc;
    acc[normalizedStatus] = Number(acc[normalizedStatus] || 0) + Number(count || 0);
    return acc;
  }, {});

const normalizeOrderListResponse = (payload = {}) => ({
  items: Array.isArray(payload.items) ? payload.items.map(normalizeOrder) : [],
  total: Number(payload.total || 0),
  page: Number(payload.page || 1),
  limit: Number(payload.limit || 0),
  total_pages: Number(payload.total_pages || 1),
  has_next: Boolean(payload.has_next),
  status_counts: normalizeOrderStatusCounts(payload.status_counts || {}),
});

const normalizeVoucher = (voucher = {}) => {
  const rawTitle = safeText(voucher.title, 'Voucher tri an');
  const title = rawTitle === 'Voucher tri an' ? 'Voucher tri ân' : rawTitle;
  return {
    code: safeText(voucher.code),
    title,
    reason: safeText(voucher.reason),
    discount_percent: Number(voucher.discount_percent || 0),
    discount_amount: Number(voucher.discount_amount || 0),
    created_at: voucher.created_at || null,
    expires_at: voucher.expires_at || null,
    is_used: Boolean(voucher.is_used),
    is_expired: Boolean(voucher.is_expired),
  };
};

const normalizeNotification = (item = {}) => ({
  ...item,
  title: safeText(item.title, 'Thông báo'),
  message: safeText(item.message),
  notification_type: safeText(item.notification_type, 'general'),
  is_read: Boolean(item.is_read),
});

const normalizeFreshnessReview = (item = {}) => ({
  ...item,
  image_url: resolveImageUrl(item.image_url),
  ai_label: safeText(item.ai_label),
  customer_display_name: safeText(item.customer_display_name, 'Khách hàng'),
  customer_area: safeText(item.customer_area, 'Khu vực khác'),
});

const normalizeAdminFeedback = (item = {}) => ({
  ...item,
  image_url: resolveImageUrl(item.image_url) || resolveImageUrl(item.scan?.image_url) || '',
  notes: safeText(item.notes),
  source: safeText(item.source, 'unknown'),
  predicted_label: safeText(item.predicted_label, 'unknown'),
  predicted_status: safeText(item.predicted_status, 'unknown'),
  corrected_label: safeText(item.corrected_label),
  corrected_status: safeText(item.corrected_status),
  user: item.user
    ? {
        ...item.user,
        username: safeText(item.user.username),
        full_name: safeText(item.user.full_name),
        email: safeText(item.user.email),
      }
    : null,
  scan: item.scan
    ? {
        ...item.scan,
        image_url: resolveImageUrl(item.scan.image_url),
      }
    : null,
});

const normalizeAdminStats = (payload = {}) => ({
  ...payload,
  last_7_days: Array.isArray(payload.last_7_days)
    ? payload.last_7_days.map((item) => ({
        date: item?.date || '',
        label: safeText(item?.label, ''),
        revenue: Number(item?.revenue || 0),
        orders: Number(item?.orders || 0),
      }))
    : [],
  low_stock_items: Array.isArray(payload.low_stock_items)
    ? payload.low_stock_items.map((item) => ({
        ...item,
        image_url: resolveImageUrl(item.image_url),
        name: safeText(item.name, 'Sản phẩm'),
        category_name: safeText(item.category_name, 'Khác'),
      }))
    : [],
  recent_feedback: Array.isArray(payload.recent_feedback)
    ? payload.recent_feedback.map(normalizeAdminFeedback)
    : [],
});

const emitProductSyncEvent = (detail) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PRODUCT_SYNC_EVENT, { detail }));
};

export const getProducts = async (params = {}) => {
  try {
    const requestedLimit = Number(params.limit);
    const skip = Number(params.skip || 0);
    const hasCustomLimit = Number.isFinite(requestedLimit) && requestedLimit > 0;
    const targetLimit = hasCustomLimit ? Math.floor(requestedLimit) : MAX_PRODUCTS_PER_REQUEST;
    const baseParams = { ...params };
    delete baseParams.limit;
    delete baseParams.skip;

    if (targetLimit <= MAX_PRODUCTS_PER_REQUEST) {
      const response = await api.get('/api/products', {
        params: { ...baseParams, skip, limit: targetLimit },
      });
      return Array.isArray(response.data) ? response.data.map(normalizeProduct) : [];
    }

    const products = [];
    let currentSkip = skip;

    while (products.length < targetLimit) {
      const batchLimit = Math.min(MAX_PRODUCTS_PER_REQUEST, targetLimit - products.length);
      const response = await api.get('/api/products', {
        params: { ...baseParams, skip: currentSkip, limit: batchLimit },
      });
      const batch = Array.isArray(response.data) ? response.data.map(normalizeProduct) : [];
      products.push(...batch);

      if (batch.length < batchLimit) break;
      currentSkip += batch.length;
    }

    return products;
  } catch (error) {
    console.error('Product API error:', error);
    return [];
  }
};

export const getFeaturedProducts = async () => {
  try {
    const response = await api.get('/api/products/featured');
    return Array.isArray(response.data) ? response.data.map(normalizeProduct) : [];
  } catch (error) {
    console.error('Featured product API error:', error);
    return [];
  }
};

export const getCategories = async () => {
  try {
    const response = await api.get('/api/products/categories', { params: { limit: 100 } });
    return response.data.map(normalizeCategory);
  } catch (error) {
    console.error('Category API error:', error);
    return [];
  }
};

export const getProductById = async (productId) => {
  const response = await api.get(`/api/products/${productId}`);
  return normalizeProduct(response.data);
};

export const register = async (userData) => {
  try {
    const response = await api.post('/api/auth/register', userData);
    return response.data;
  } catch (error) {
    throw apiError(error, 'Lỗi đăng ký');
  }
};

export const login = async (username, password) => {
  try {
    const response = await api.post('/api/auth/login', { username, password });
    saveAuthSession(response.data);
    return response.data;
  } catch (error) {
    throw apiError(error, 'Lỗi đăng nhập');
  }
};

export const logout = () => clearAuthSession();

export const getAdminStats = async () => {
  try {
    const response = await api.get('/api/admin/stats');
    return normalizeAdminStats(response.data);
  } catch (error) {
    throw apiError(error, 'Lỗi lấy thống kê');
  }
};

export const getAdminFeedbackEvents = async (params = {}) => {
  try {
    const response = await api.get('/api/admin/feedback-events', { params });
    return {
      ...response.data,
      items: Array.isArray(response.data?.items) ? response.data.items.map(normalizeAdminFeedback) : [],
      total: Number(response.data?.total || 0),
      unread_count: Number(response.data?.unread_count || 0),
      read_count: Number(response.data?.read_count || 0),
      disputed_count: Number(response.data?.disputed_count || 0),
      global_total: Number(response.data?.global_total || 0),
      global_unread_count: Number(response.data?.global_unread_count || 0),
      global_read_count: Number(response.data?.global_read_count || 0),
      global_disputed_count: Number(response.data?.global_disputed_count || 0),
      page: Number(response.data?.page || 1),
      limit: Number(response.data?.limit || 12),
      total_pages: Number(response.data?.total_pages || 1),
      has_next: Boolean(response.data?.has_next),
    };
  } catch (error) {
    throw apiError(error, 'Không thể tải danh sách phản hồi AI');
  }
};

export const markAdminFeedbackRead = async (feedbackId) => {
  try {
    const response = await api.put(`/api/admin/feedback-events/${feedbackId}/read`);
    return normalizeAdminFeedback(response.data);
  } catch (error) {
    throw apiError(error, 'Không thể cập nhật trạng thái feedback');
  }
};

const buildProductRequestBody = (productData = {}) => {
  if (productData instanceof FormData) return productData;

  const shouldUseMultipart = typeof File !== 'undefined' && productData?.image_file instanceof File;
  if (!shouldUseMultipart) return productData;

  const formData = new FormData();
  Object.entries(productData).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (key === 'image_file') {
      formData.append('image_file', value);
      return;
    }
    formData.append(key, String(value));
  });
  return formData;
};

export const addProduct = async (productData) => {
  try {
    const response = await api.post('/api/products/add', buildProductRequestBody(productData));
    const updatedProduct = normalizeProduct(response.data?.product || response.data);
    emitProductSyncEvent({ type: 'upsert', product: updatedProduct });
    return response.data;
  } catch (error) {
    throw apiError(error, 'Không thể thêm sản phẩm');
  }
};

export const updateProduct = async (productId, productData) => {
  try {
    const response = await api.put(`/api/products/${productId}`, buildProductRequestBody(productData));
    const updatedProduct = normalizeProduct(response.data?.product || response.data);
    emitProductSyncEvent({ type: 'upsert', product: updatedProduct });
    return response.data;
  } catch (error) {
    throw apiError(error, 'Không thể cập nhật sản phẩm');
  }
};

export const deleteProduct = async (productId) => {
  try {
    const response = await api.delete(`/api/products/${productId}`);
    emitProductSyncEvent({ type: 'remove', productId });
    return response.data;
  } catch (error) {
    throw apiError(error, 'Không thể xóa sản phẩm');
  }
};

export const getAdminUsersPage = async (params = {}) => {
  try {
    const response = await api.get('/api/admin/users/paginated', { params });
    return {
      items: Array.isArray(response.data?.items) ? response.data.items : [],
      total: Number(response.data?.total || 0),
      page: Number(response.data?.page || 1),
      limit: Number(response.data?.limit || 12),
      total_pages: Number(response.data?.total_pages || 1),
      has_next: Boolean(response.data?.has_next),
    };
  } catch (error) {
    throw apiError(error, 'Không thể tải danh sách người dùng');
  }
};

export const deleteUser = async (userId) => {
  try {
    const response = await api.delete(`/api/admin/users/${userId}`);
    return response.data;
  } catch (error) {
    throw apiError(error, 'Lỗi xóa người dùng');
  }
};

export const updateUserRole = async (userId, role) => {
  try {
    const response = await api.put(`/api/admin/users/${userId}/role`, { role });
    return response.data;
  } catch (error) {
    throw apiError(error, 'Không thể cập nhật quyền người dùng');
  }
};

export const getAdminOrdersPage = async (params = {}) => {
  try {
    const response = await api.get('/api/admin/orders/paginated', { params });
    return normalizeOrderListResponse(response.data);
  } catch (error) {
    throw apiError(error, 'Lỗi tải danh sách đơn hàng');
  }
};

export const getOrderDetail = async (orderId) => {
  try {
    const response = await api.get(`/api/admin/orders/${orderId}`);
    return normalizeOrder(response.data);
  } catch (error) {
    throw apiError(error, 'Lỗi lấy chi tiết đơn hàng');
  }
};

export const updateOrderStatus = async (orderId, newStatus) => {
  try {
    const response = await api.put(`/api/admin/orders/${orderId}/status`, { new_status: newStatus });
    return response.data;
  } catch (error) {
    throw apiError(error, 'Lỗi cập nhật trạng thái');
  }
};

export const bulkUpdateOrderStatus = async (orderIds, newStatus) => {
  try {
    const response = await api.put('/api/admin/orders/bulk-status', {
      order_ids: orderIds,
      new_status: newStatus,
    });
    return response.data;
  } catch (error) {
    throw apiError(error, 'Lỗi cập nhật trạng thái hàng loạt');
  }
};

export const deleteOrder = async (orderId) => {
  try {
    const response = await api.delete(`/api/admin/orders/${orderId}`);
    return response.data;
  } catch (error) {
    throw apiError(error, 'Lỗi xóa đơn hàng');
  }
};

export const createOrder = async (orderData) => {
  try {
    const response = await api.post('/api/orders', orderData);
    return normalizeOrder(response.data);
  } catch (error) {
    throw apiError(error, 'Lỗi tạo đơn hàng');
  }
};

export const getUserOrders = async () => {
  try {
    const response = await api.get('/api/orders');
    return response.data.map(normalizeOrder);
  } catch (error) {
    throw apiError(error, 'Lỗi lấy danh sách đơn hàng');
  }
};

export const getUserOrdersPage = async (params = {}) => {
  try {
    const response = await api.get('/api/orders/paginated', { params });
    return normalizeOrderListResponse(response.data);
  } catch (error) {
    throw apiError(error, 'Lỗi lấy danh sách đơn hàng');
  }
};

export const getNotifications = async (params = {}) => {
  try {
    const response = await api.get('/api/notifications', { params });
    return Array.isArray(response.data) ? response.data.map(normalizeNotification) : [];
  } catch (error) {
    throw apiError(error, 'Không thể tải thông báo');
  }
};

export const markNotificationRead = async (notificationId) => {
  try {
    const response = await api.put(`/api/notifications/${notificationId}/read`);
    return normalizeNotification(response.data);
  } catch (error) {
    throw apiError(error, 'Không thể cập nhật thông báo');
  }
};

export const getOrderFreshnessEligibility = async (orderId) => {
  try {
    const response = await api.get(`/api/orders/${orderId}/freshness-confirmation`);
    return {
      ...response.data,
      items: Array.isArray(response.data?.items) ? response.data.items.map(normalizeOrderItem) : [],
      reward_points: Number(response.data?.reward_points || 0),
      is_available: Boolean(response.data?.is_available),
      is_expired: Boolean(response.data?.is_expired),
      already_confirmed: Boolean(response.data?.already_confirmed),
    };
  } catch (error) {
    throw apiError(error, 'Không thể tải thông tin xác nhận độ tươi');
  }
};

export const submitOrderFreshnessConfirmation = async (orderId, payload) => {
  try {
    const formData = new FormData();
    formData.append('payload', JSON.stringify({ reviews: payload.reviews || [] }));
    (payload.files || []).forEach(({ field, file }) => {
      if (file instanceof File) {
        formData.append(field, file);
      }
    });

    const response = await api.post(`/api/orders/${orderId}/freshness-confirmation`, formData);
    return {
      ...response.data,
      awarded_points: Number(response.data?.awarded_points || 0),
      loyalty_points: Number(response.data?.loyalty_points || 0),
      all_predictions_correct: Boolean(response.data?.all_predictions_correct),
      complaint_available: Boolean(response.data?.complaint_available),
      thank_you_message: safeText(response.data?.thank_you_message),
      voucher: response.data?.voucher ? normalizeVoucher(response.data.voucher) : null,
      reviews: Array.isArray(response.data?.reviews) ? response.data.reviews.map(normalizeFreshnessReview) : [],
    };
  } catch (error) {
    throw apiError(error, 'Không thể gửi xác nhận độ tươi');
  }
};

export const getAdminFreshnessVerificationReports = async (params = {}) => {
  try {
    const response = await api.get('/api/admin/freshness-verification-reports', {
      params: compactQueryParams(params),
    });
    return {
      items: Array.isArray(response.data?.items)
        ? response.data.items.map((item) => ({
            ...item,
            image_url: resolveImageUrl(item.image_url),
            confidence: Number(item.confidence || 0),
            manual_note: safeText(item.manual_note),
            reward_points: Number(item.reward_points || 0),
            voucher_id: item.voucher_id ?? null,
            voucher_code: safeText(item.voucher_code),
            user: item.user
              ? {
                  ...item.user,
                  username: safeText(item.user.username),
                  full_name: safeText(item.user.full_name),
                  email: safeText(item.user.email),
                }
              : null,
          }))
        : [],
      total: Number(response.data?.total || 0),
      page: Number(response.data?.page || 1),
      limit: Number(response.data?.limit || 12),
      total_pages: Number(response.data?.total_pages || 1),
      has_next: Boolean(response.data?.has_next),
    };
  } catch (error) {
    throw apiError(error, 'Không thể tải báo cáo xác minh độ tươi');
  }
};

export const exportAdminFreshnessVerificationReportsExcel = async (params = {}) => {
  try {
    const response = await api.get('/api/admin/freshness-verification-reports/export-excel', {
      params: compactQueryParams(params),
      responseType: 'blob',
    });
    return {
      blob: response.data,
      filename: resolveDownloadFilename(
        response.headers?.['content-disposition'],
        `freshness-verification-reports-${new Date().toISOString().slice(0, 10)}.xlsx`,
      ),
    };
  } catch (error) {
    throw apiError(error, 'Không thể xuất Excel báo cáo xác minh độ tươi');
  }
};

export const patchUserPoints = async (delta) => {
  try {
    const response = await api.patch('/api/user/points', { delta });
    return {
      ...response.data,
      delta: Number(response.data?.delta || 0),
      loyalty_points: Number(response.data?.loyalty_points || 0),
    };
  } catch (error) {
    throw apiError(error, 'Không thể cập nhật điểm người dùng');
  }
};

export const generateVoucher = async (payload) => {
  try {
    const response = await api.post('/api/vouchers/generate', payload);
    return normalizeVoucher(response.data);
  } catch (error) {
    throw apiError(error, 'Không thể tạo voucher');
  }
};

export const getMyVouchers = async () => {
  try {
    const response = await api.get('/api/vouchers/mine');
    return Array.isArray(response.data) ? response.data.map(normalizeVoucher) : [];
  } catch (error) {
    throw apiError(error, 'Không thể tải danh sách voucher');
  }
};

export const submitVerificationReport = async (payload) => {
  try {
    const response = await api.post('/api/admin/verification-report', payload);
    return response.data;
  } catch (error) {
    throw apiError(error, 'Không thể gửi báo cáo xác minh');
  }
};

export const createFreshnessComplaint = async (orderId, payload) => {
  try {
    const response = await api.post(`/api/orders/${orderId}/freshness-complaints`, payload);
    return response.data;
  } catch (error) {
    throw apiError(error, 'Không thể tạo yêu cầu bồi thường');
  }
};

export const getProductFreshnessReviews = async (productId) => {
  try {
    const response = await api.get(`/api/products/${productId}/freshness-reviews`);
    return {
      avg_score: response.data?.avg_score == null ? null : Number(response.data.avg_score),
      total_reviews: Number(response.data?.total_reviews || 0),
      reviews: Array.isArray(response.data?.reviews) ? response.data.reviews.map(normalizeFreshnessReview) : [],
    };
  } catch (error) {
    throw apiError(error, 'Không thể tải đánh giá độ tươi');
  }
};

export const updateUserOrder = async (orderId, orderData) => {
  try {
    const response = await api.put(`/api/orders/${orderId}`, orderData);
    return normalizeOrder(response.data);
  } catch (error) {
    throw apiError(error, 'Lỗi cập nhật đơn hàng');
  }
};

export const cancelUserOrder = async (orderId) => {
  try {
    const response = await api.post(`/api/orders/${orderId}/cancel`);
    return response.data;
  } catch (error) {
    throw apiError(error, 'Lỗi hủy đơn hàng');
  }
};

export const getUserProfile = async () => {
  try {
    const response = await api.get('/api/auth/me');
    return response.data;
  } catch (error) {
    throw apiError(error, 'Lỗi lấy thông tin hồ sơ');
  }
};

export const updateUserProfile = async (userData) => {
  try {
    const response = await api.put('/api/auth/me', userData);
    return response.data;
  } catch (error) {
    throw apiError(error, 'Không thể cập nhật hồ sơ');
  }
};

export const requestPasswordReset = async (email) => {
  try {
    const response = await api.post('/api/auth/forgot-password', { email });
    return response.data;
  } catch (error) {
    throw apiError(error, 'Không thể gửi yêu cầu đặt lại mật khẩu');
  }
};

export const getStockTransactionsPage = async (params = {}) => {
  try {
    const response = await api.get('/api/admin/stock-transactions/paginated', { params });
    return {
      items: Array.isArray(response.data?.items) ? response.data.items : [],
      total: Number(response.data?.total || 0),
      page: Number(response.data?.page || 1),
      limit: Number(response.data?.limit || 12),
      total_pages: Number(response.data?.total_pages || 1),
      has_next: Boolean(response.data?.has_next),
    };
  } catch (error) {
    throw apiError(error, 'Không thể tải lịch sử giao dịch kho');
  }
};

export const addStockTransaction = async ({ product_id, type, quantity, note, transaction_date }) => {
  try {
    const response = await api.post('/api/admin/stock-transactions', {
      product_id,
      type,
      quantity: Number(quantity),
      note: note || null,
      transaction_date: transaction_date || null,
    });
    return response.data;
  } catch (error) {
    throw apiError(error, 'Lỗi ghi giao dịch kho');
  }
};

export const exportStockTransactionsExcel = async (params = {}) => {
  try {
    const response = await api.get('/api/admin/stock-transactions/export-excel', {
      params,
      responseType: 'blob',
    });
    return {
      blob: response.data,
      filename: resolveDownloadFilename(
        response.headers?.['content-disposition'],
        `stock-transactions-${new Date().toISOString().slice(0, 10)}.xlsx`,
      ),
    };
  } catch (error) {
    throw apiError(error, 'Không thể xuất file Excel giao dịch kho');
  }
};

export const importStockTransactionsExcel = async (excelFile) => {
  try {
    const formData = new FormData();
    formData.append('excel_file', excelFile);
    const response = await api.post('/api/admin/stock-transactions/import-excel', formData);
    return response.data;
  } catch (error) {
    throw apiError(error, 'Không thể nhập file Excel giao dịch kho');
  }
};

export const getAdminPaymentQRCode = async () => {
  try {
    const response = await api.get('/api/admin/payment-qr');
    if (!response.data) return null;
    return normalizePaymentQr(response.data);
  } catch (error) {
    throw apiError(error, 'Không thể tải mã QR thanh toán');
  }
};

export const getPaymentQRCode = async () => {
  try {
    const response = await api.get('/api/payment-qr');
    if (!response.data) return null;
    return normalizePaymentQr(response.data);
  } catch (error) {
    throw apiError(error, 'Không thể tải mã QR thanh toán');
  }
};

export const updateAdminPaymentQRCode = async ({ provider_name, image_file }) => {
  try {
    const formData = new FormData();
    if (provider_name) formData.append('provider_name', provider_name);
    if (image_file instanceof File) formData.append('image_file', image_file);
    const response = await api.put('/api/admin/payment-qr', formData);
    return normalizePaymentQr(response.data);
  } catch (error) {
    throw apiError(error, 'Không thể cập nhật mã QR thanh toán');
  }
};

export const changePassword = async (payload) => {
  try {
    const response = await api.post('/api/auth/change-password', payload);
    return response.data;
  } catch (error) {
    throw apiError(error, 'Không thể đổi mật khẩu');
  }
};

// ============ DELIVERY PROFILES ============

export const getDeliveryProfiles = async () => {
  try {
    const response = await api.get('/api/delivery-profiles');
    return response.data;
  } catch (error) {
    throw apiError(error, 'Không thể tải danh sách địa chỉ');
  }
};

export const createDeliveryProfile = async (data) => {
  try {
    const response = await api.post('/api/delivery-profiles', data);
    return response.data;
  } catch (error) {
    throw apiError(error, 'Không thể tạo địa chỉ mới');
  }
};

export const updateDeliveryProfile = async (profileId, data) => {
  try {
    const response = await api.put(`/api/delivery-profiles/${profileId}`, data);
    return response.data;
  } catch (error) {
    throw apiError(error, 'Không thể cập nhật địa chỉ');
  }
};

export const deleteDeliveryProfile = async (profileId) => {
  try {
    const response = await api.delete(`/api/delivery-profiles/${profileId}`);
    return response.data;
  } catch (error) {
    throw apiError(error, 'Không thể xóa địa chỉ');
  }
};

export const setDefaultDeliveryProfile = async (profileId) => {
  try {
    const response = await api.put(`/api/delivery-profiles/${profileId}/set-default`);
    return response.data;
  } catch (error) {
    throw apiError(error, 'Không thể đặt địa chỉ mặc định');
  }
};

export const submitScannerFeedback = async (payload) => {
  try {
    const response = await api.post('/api/scans/feedback-events', payload);
    return response.data;
  } catch (error) {
    throw apiError(error, 'Không thể gửi feedback scanner');
  }
};

export const quickAnalyzeScan = async ({
  imageFile,
  imageUrl,
  commodityGroup = 'produce',
  spoilageProfile = '',
  referenceWidthMm,
  referenceWidthPx,
  tfjsPredictions,
  orderId,
}) => {
  try {
    const formData = new FormData();
    if (imageFile instanceof File) {
      formData.append('image_file', imageFile);
    } else if (imageUrl) {
      formData.append('image_url', imageUrl);
    }
    formData.append('commodity_group', commodityGroup || 'produce');
    if (spoilageProfile) formData.append('spoilage_profile', spoilageProfile);
    if (referenceWidthMm !== undefined && referenceWidthMm !== null && referenceWidthMm !== '') {
      formData.append('reference_width_mm', String(referenceWidthMm));
    }
    if (referenceWidthPx !== undefined && referenceWidthPx !== null && referenceWidthPx !== '') {
      formData.append('reference_width_px', String(referenceWidthPx));
    }
    if (Array.isArray(tfjsPredictions) && tfjsPredictions.length > 0) {
      formData.append('tfjs_predictions_json', JSON.stringify(tfjsPredictions));
    }
    if (orderId !== undefined && orderId !== null && orderId !== '') {
      formData.append('order_id', String(orderId));
    }

    const response = await api.post('/api/scans/quick-analyze', formData);
    return response.data;
  } catch (error) {
    throw apiError(error, 'Không thể phân tích nhanh scanner');
  }
};

export default api;

