import axios from 'axios';
import { getNavigationSignal } from './navigationTasks';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/300?text=FreshFood';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user';
const AUTH_EXPIRED_EVENT = 'freshfood:auth-expired';

const api = axios.create({
  baseURL: API_BASE_URL,
});

let refreshPromise = null;

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
  if (notify) {
    notifyAuthExpired();
  }

  if (redirect && window.location.pathname !== '/auth') {
    window.location.assign('/auth');
  }
};

const apiError = (error, fallback) => {
  if (error?.detail) return error;
  if (error?.response?.data) return error.response.data;
  if (error?.message) return { detail: error.message };
  return { detail: fallback };
};

const refreshAuthToken = async () => {
  const refresh_token = getRefreshToken();
  if (!refresh_token) {
    throw new Error('PhiÃªn Ä‘Äƒng nháº­p Ä‘Ã£ háº¿t háº¡n. Vui lÃ²ng Ä‘Äƒng nháº­p láº¡i.');
  }

  const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
    refresh_token,
  });

  saveAuthSession(response.data);
  return response.data.access_token;
};

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (!config.signal) {
    config.signal = getNavigationSignal();
  }
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
        refreshPromise = refreshAuthToken().finally(() => {
          refreshPromise = null;
        });
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
  return `${number.toLocaleString('vi-VN')}Ä‘`;
};

export const normalizeProduct = (product = {}) => {
  const priceNumber = Number(product.discount_price ?? product.price ?? 0);
  const categoryName =
    product.category?.name ||
    product.category_name ||
    product.category ||
    (product.category_id ? `Danh má»¥c #${product.category_id}` : 'Sáº£n pháº©m');

  return {
    ...product,
    price: priceNumber,
    priceText: formatCurrency(priceNumber),
    img: product.img || product.image_url || PLACEHOLDER_IMAGE,
    image_url: product.image_url || product.img || PLACEHOLDER_IMAGE,
    category: categoryName,
    stock: product.stock ?? product.quantity ?? 0,
    quantity: product.quantity ?? product.stock ?? 0,
    unit: product.unit || 'kg',
    stock_status: product.stock_status || ((product.quantity ?? product.stock ?? 0) > 0 ? 'in_stock' : 'out_of_stock'),
  };
};

export const normalizeOrderStatus = (status) => {
  const normalized = String(status || '').trim().toLowerCase();
  const labels = {
    pending: 'Chá» xÃ¡c nháº­n',
    'chá» xÃ¡c nháº­n': 'Chá» xÃ¡c nháº­n',
    confirmed: 'ÄÃ£ xÃ¡c nháº­n',
    'Ä‘Ã£ xÃ¡c nháº­n': 'ÄÃ£ xÃ¡c nháº­n',
    shipped: 'Äang giao',
    'Ä‘ang giao': 'Äang giao',
    delivered: 'ÄÃ£ giao',
    'Ä‘Ã£ giao': 'ÄÃ£ giao',
    cancelled: 'ÄÃ£ há»§y',
    'Ä‘Ã£ há»§y': 'ÄÃ£ há»§y',
    returned: 'ÄÃ£ tráº£',
    'Ä‘Ã£ tráº£': 'ÄÃ£ tráº£',
  };
  return labels[normalized] || status || 'KhÃ´ng rÃµ';
};

export const normalizeOrderItem = (item = {}) => {
  const product = item.product ? normalizeProduct(item.product) : null;
  return {
    ...item,
    product,
    product_name: product?.name || item.product_name || `Sáº£n pháº©m #${item.product_id}`,
    quantity: Number(item.quantity || 0),
    price_at_purchase: Number(item.price_at_purchase || 0),
    subtotal: Number(item.subtotal || 0),
  };
};

export const normalizeOrder = (order = {}) => ({
  ...order,
  status: order.status?.value || order.status,
  subtotal: Number(order.subtotal || 0),
  tax: Number(order.tax || 0),
  shipping_fee: Number(order.shipping_fee || 0),
  discount: Number(order.discount || 0),
  total: Number(order.total ?? order.total_price ?? 0),
  items: Array.isArray(order.items) ? order.items.map(normalizeOrderItem) : [],
});

export const getProducts = async (params = {}) => {
  try {
    const response = await api.get('/api/products', {
      params: {
        limit: 100,
        ...params,
      },
    });
    return response.data.map(normalizeProduct);
  } catch (error) {
    console.error('Lá»—i káº¿t ná»‘i API:', error);
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
    throw apiError(error, 'Lá»—i Ä‘Äƒng kÃ½');
  }
};

export const login = async (username, password) => {
  try {
    const response = await api.post('/api/auth/login', { username, password });
    saveAuthSession(response.data);
    return response.data;
  } catch (error) {
    throw apiError(error, 'Lá»—i Ä‘Äƒng nháº­p');
  }
};

export const logout = () => {
  clearAuthSession();
};

export const getAdminStats = async () => {
  try {
    const response = await api.get('/api/admin/stats');
    return response.data;
  } catch (error) {
    throw apiError(error, 'Lá»—i láº¥y thá»‘ng kÃª');
  }
};

export const addProduct = async (productData) => {
  try {
    const response = await api.post('/api/products/add', productData);
    return response.data;
  } catch (error) {
    throw apiError(error, 'Lá»—i thÃªm sáº£n pháº©m');
  }
};

export const deleteProduct = async (productId) => {
  try {
    const response = await api.delete(`/api/products/${productId}`);
    return response.data;
  } catch (error) {
    throw apiError(error, 'Lá»—i xÃ³a sáº£n pháº©m');
  }
};

export const getAllUsers = async () => {
  try {
    const response = await api.get('/api/admin/users');
    return response.data;
  } catch (error) {
    throw apiError(error, 'Lá»—i láº¥y danh sÃ¡ch ngÆ°á»i dÃ¹ng');
  }
};

export const deleteUser = async (userId) => {
  try {
    const response = await api.delete(`/api/admin/users/${userId}`);
    return response.data;
  } catch (error) {
    throw apiError(error, 'Lá»—i xÃ³a ngÆ°á»i dÃ¹ng');
  }
};

export const getAllOrders = async () => {
  try {
    const response = await api.get('/api/admin/orders');
    return response.data.map(normalizeOrder);
  } catch (error) {
    throw apiError(error, 'Lá»—i láº¥y danh sÃ¡ch Ä‘Æ¡n hÃ ng');
  }
};

export const getOrderDetail = async (orderId) => {
  try {
    const response = await api.get(`/api/admin/orders/${orderId}`);
    return normalizeOrder(response.data);
  } catch (error) {
    throw apiError(error, 'Lá»—i láº¥y chi tiáº¿t Ä‘Æ¡n hÃ ng');
  }
};

export const updateOrderStatus = async (orderId, newStatus) => {
  try {
    const response = await api.put(`/api/admin/orders/${orderId}/status`, {
      new_status: newStatus,
    });
    return response.data;
  } catch (error) {
    throw apiError(error, 'Lá»—i cáº­p nháº­t tráº¡ng thÃ¡i');
  }
};

export const deleteOrder = async (orderId) => {
  try {
    const response = await api.delete(`/api/admin/orders/${orderId}`);
    return response.data;
  } catch (error) {
    throw apiError(error, 'Lá»—i xÃ³a Ä‘Æ¡n hÃ ng');
  }
};

export const createOrder = async (orderData) => {
  try {
    const response = await api.post('/api/orders', orderData);
    return normalizeOrder(response.data);
  } catch (error) {
    throw apiError(error, 'Lá»—i táº¡o Ä‘Æ¡n hÃ ng');
  }
};

export const getUserOrders = async () => {
  try {
    const response = await api.get('/api/orders');
    return response.data.map(normalizeOrder);
  } catch (error) {
    throw apiError(error, 'Lá»—i láº¥y danh sÃ¡ch Ä‘Æ¡n hÃ ng');
  }
};

export const updateUserOrder = async (orderId, orderData) => {
  try {
    const response = await api.put(`/api/orders/${orderId}`, orderData);
    return normalizeOrder(response.data);
  } catch (error) {
    throw apiError(error, 'Lá»—i cáº­p nháº­t Ä‘Æ¡n hÃ ng');
  }
};

export const cancelUserOrder = async (orderId) => {
  try {
    const response = await api.post(`/api/orders/${orderId}/cancel`);
    return response.data;
  } catch (error) {
    throw apiError(error, 'Lá»—i há»§y Ä‘Æ¡n hÃ ng');
  }
};

export const getUserProfile = async () => {
  try {
    const response = await api.get('/api/auth/me');
    return response.data;
  } catch (error) {
    throw apiError(error, 'Lá»—i láº¥y thÃ´ng tin há»“ sÆ¡');
  }
};

export const updateUserProfile = async (userData) => {
  try {
    const response = await api.put('/api/auth/me', userData);
    return response.data;
  } catch (error) {
    throw apiError(error, 'Lá»—i cáº­p nháº­t thÃ´ng tin');
  }
};

export default api;


