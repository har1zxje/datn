import { safeText } from '../text';
import { PAGE_SIZE } from '../../constants/adminDashboard';

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const getRoleLabel = (item) => {
  if (item?.is_admin) return 'Quản trị viên';
  if (item?.role === 'staff') return 'Nhân viên';
  return 'Người dùng';
};

export const getRoleBadgeClass = (item) => {
  if (item?.is_admin) return 'bg-emerald-100 text-emerald-800';
  if (item?.role === 'staff') return 'bg-sky-100 text-sky-800';
  return 'bg-slate-100 text-slate-600';
};

export const getUserMonogram = (item) => {
  const base = safeText(item?.full_name || item?.username, 'U').trim();
  return base.charAt(0).toUpperCase();
};

export const getStockBadge = (qty, threshold) => {
  if (qty <= 0) return { label: 'Hết hàng', className: 'bg-rose-100 text-rose-700' };
  if (qty <= threshold) return { label: 'Sắp hết', className: 'bg-amber-100 text-amber-900' };
  return { label: 'Ổn định', className: 'bg-emerald-100 text-emerald-700' };
};

export const getStockState = (qty, threshold) => {
  if (qty <= 0) return 'out';
  if (qty <= threshold) return 'low';
  return 'ok';
};

export const getStockRowTint = (qty, threshold) => {
  const state = getStockState(qty, threshold);
  if (state === 'out') return 'bg-rose-50/90';
  if (state === 'low') return 'bg-[rgba(254,249,195,0.75)]';
  return 'bg-white';
};

export const getStockProgressMeta = (qty, threshold) => {
  const safeQty = Math.max(Number(qty || 0), 0);
  const safeThreshold = Math.max(Number(threshold || 0), 1);
  const scale = Math.max(safeThreshold * 2, safeQty, 1);
  const percent = Math.max(6, Math.min(100, Math.round((safeQty / scale) * 100)));
  const state = getStockState(safeQty, safeThreshold);
  return {
    percent,
    className: state === 'out' ? 'bg-rose-500' : state === 'low' ? 'bg-amber-500' : 'bg-emerald-500',
    trackClassName: state === 'out' ? 'bg-rose-100' : state === 'low' ? 'bg-amber-100' : 'bg-emerald-100',
  };
};

export const getWarehouseProductOptionLabel = (product) =>
  `${safeText(product?.name, 'Sản phẩm')} (#${product?.id})`;

export const buildProductPayload = (formState, categoryDirectory, { includeStock = true } = {}) => {
  const targetCategory = categoryDirectory.find(
    (item) => String(item.id) === String(formState.categoryId),
  );
  const formData = new FormData();
  formData.append('name', formState.name.trim());
  formData.append('description', formState.description.trim());
  formData.append('price', String(Number(formState.price || 0)));
  formData.append('unit', formState.unit || 'kg');
  formData.append('low_stock_threshold', String(Number(formState.lowStockThreshold || 5)));
  formData.append('promotion_type', formState.promotionType || 'none');
  formData.append('promotion_value', String(Number(formState.promotionValue || 0)));
  formData.append('promotion_label', safeText(formState.promotionLabel));
  formData.append('is_featured', String(Boolean(formState.isFeatured)));
  if (includeStock) {
    formData.append('stock', String(Number(formState.stock || 0)));
  }
  if (targetCategory?.backendId) {
    formData.append('category_id', String(targetCategory.backendId));
  } else if (targetCategory?.name) {
    formData.append('category', targetCategory.name);
  }
  if (formState.imageFile) {
    formData.append('image_file', formState.imageFile);
  } else if (formState.imageDataUrl) {
    formData.append('image_url', formState.imageDataUrl);
  } else if (formState.imageUrl) {
    formData.append('image_url', formState.imageUrl);
  }
  return formData;
};

export const normalizeText = (value) =>
  safeText(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

export const paginateItems = (items, page, pageSize = PAGE_SIZE) => {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  return {
    items: items.slice(startIndex, startIndex + pageSize),
    total,
    page: safePage,
    totalPages,
    hasNext: safePage < totalPages,
  };
};

export const buildPaginationItems = (page, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items = [1];
  if (page > 3) items.push('left-ellipsis');
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  for (let v = start; v <= end; v += 1) items.push(v);
  if (page < totalPages - 2) items.push('right-ellipsis');
  items.push(totalPages);
  return items;
};

export const buildChartCoordinates = (series, width, height, paddingX = 10, paddingY = 10) => {
  const safeSeries =
    Array.isArray(series) && series.length > 0 ? series : [{ value: 0, label: '' }];
  const maxValue = Math.max(...safeSeries.map((item) => Number(item.value || 0)), 0);
  const minValue = Math.min(...safeSeries.map((item) => Number(item.value || 0)), 0);
  const range = maxValue - minValue || 1;
  const drawableWidth = Math.max(width - paddingX * 2, 1);
  const drawableHeight = Math.max(height - paddingY * 2, 1);
  return safeSeries.map((item, index) => {
    const x =
      paddingX +
      (safeSeries.length === 1 ? 0.5 : index / Math.max(safeSeries.length - 1, 1)) * drawableWidth;
    const y = paddingY + ((maxValue - Number(item.value || 0)) / range) * drawableHeight;
    return { ...item, x, y, value: Number(item.value || 0) };
  });
};

export const buildLinePath = (points) =>
  points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

export const buildAreaPath = (points, height) => {
  if (points.length === 0) return '';
  return `${buildLinePath(points)} L ${points[points.length - 1].x} ${height - 10} L ${points[0].x} ${height - 10} Z`;
};
