import {
  ClipboardList,
  FileText,
  Grid2x2,
  LayoutDashboard,
  List,
  PackagePlus,
  Settings2,
  UsersRound,
  Warehouse,
} from 'lucide-react';
import { safeText } from '../utils/text';

export const FEATURED_PRODUCT_LIMIT = 5;

export const TAB_DEFINITIONS = [
  { key: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
  { key: 'users', label: 'Người dùng', icon: UsersRound },
  { key: 'orders', label: 'Đơn hàng', icon: ClipboardList },
  { key: 'products', label: 'Sản phẩm', icon: PackagePlus },
  { key: 'warehouse', label: 'Kho hàng', icon: Warehouse },
  { key: 'freshnessReports', label: 'Xác minh sau giao', icon: FileText },
  { key: 'settings', label: 'Cài đặt', icon: Settings2 },
];

export const STAFF_TABS = new Set(['orders', 'products', 'warehouse']);
export const PAGE_SIZE = 8;
export const PRODUCT_PAGE_SIZE_OPTIONS = [20, 50, 100];

export const PRODUCT_VIEW_MODES = [
  { value: 'list', label: 'Dạng danh sách', icon: List },
  { value: 'grid', label: 'Dạng lưới', icon: Grid2x2 },
];

export const WAREHOUSE_SECTIONS = [
  { value: 'inventory', label: 'Tồn kho hiện tại' },
  { value: 'transactions', label: 'Ghi nhận giao dịch' },
  { value: 'excel', label: 'Import / Export Excel' },
  { value: 'create', label: 'Thêm sản phẩm mới' },
];

export const SETTINGS_SECTIONS = [
  { value: 'qr', label: 'Thanh toán QR' },
  { value: 'store', label: 'Thông tin cửa hàng' },
  { value: 'notifications', label: 'Thông báo' },
];

export const WAREHOUSE_EXPORT_SCOPES = [
  { value: 'filtered', label: 'Đang lọc hiện tại' },
  { value: 'all', label: 'Tất cả giao dịch' },
  { value: 'import', label: 'Chỉ nhập kho' },
  { value: 'export', label: 'Chỉ xuất kho' },
];

export const PAGE_COPY = {
  overview: {
    title: 'Tổng quan vận hành',
    subtitle: 'Theo dõi doanh thu, đơn mới và tồn kho trong một màn hình.',
  },
  users: {
    title: 'Quản lý người dùng',
    subtitle: 'Tìm nhanh, phân trang và cập nhật vai trò.',
  },
  orders: {
    title: 'Vận hành đơn hàng',
    subtitle: 'Theo dõi, lọc và cập nhật trạng thái đơn hàng.',
  },
  products: {
    title: 'Quản lý sản phẩm',
    subtitle: 'Cập nhật badge, trạng thái nổi bật và thông tin sản phẩm.',
  },
  warehouse: {
    title: 'Kho hàng',
    subtitle: 'Theo dõi tồn kho, ghi nhận giao dịch và xử lý file Excel.',
  },
  freshnessReports: {
    title: 'Báo cáo xác minh sau giao hàng',
    subtitle: 'Theo dõi từng lượt xác minh, đối chiếu kết quả AI với phản hồi khách hàng và xuất Excel khi cần.',
  },
  settings: {
    title: 'Cài đặt thanh toán',
    subtitle: 'Cập nhật mã QR thanh toán đang hiển thị cho khách hàng.',
  },
};

export const PRODUCT_BADGE_OPTIONS = [
  { value: 'none', label: 'Không có', promotionType: 'none', promotionValue: 0, promotionLabel: '' },
  { value: 'saving', label: 'Giá tiết kiệm', promotionType: 'badge', promotionValue: 0, promotionLabel: 'Giá tiết kiệm' },
  { value: 'buy2get1', label: 'Mua 2 tặng 1', promotionType: 'badge', promotionValue: 0, promotionLabel: 'Mua 2 tặng 1' },
  { value: 'freeship', label: 'Freeship', promotionType: 'badge', promotionValue: 0, promotionLabel: 'Freeship' },
  { value: 'discount10', label: 'Giảm 10%', promotionType: 'percent', promotionValue: 10, promotionLabel: '-10%' },
  { value: 'discount15', label: 'Giảm 15%', promotionType: 'percent', promotionValue: 15, promotionLabel: '-15%' },
  { value: 'discount20', label: 'Giảm 20%', promotionType: 'percent', promotionValue: 20, promotionLabel: '-20%' },
  { value: 'discount25', label: 'Giảm 25%', promotionType: 'percent', promotionValue: 25, promotionLabel: '-25%' },
];

export const PRODUCT_BADGE_SELECT_OPTIONS = [
  ...PRODUCT_BADGE_OPTIONS,
  { value: 'custom', label: 'Khuyến mãi khác', disabled: true },
];

const normalizePromotionLabel = (value) => safeText(value).trim().toLowerCase();

export const getProductBadgeOptionByValue = (value) =>
  PRODUCT_BADGE_OPTIONS.find((option) => option.value === value) || PRODUCT_BADGE_OPTIONS[0];

export const getProductBadgeOptionValue = (product) => {
  const promotionType = safeText(product?.promotion_type, 'none').trim().toLowerCase() || 'none';
  const promotionLabel = normalizePromotionLabel(product?.promotion_label);
  const promotionValue = Number(product?.promotion_value || 0);

  const matchedOption = PRODUCT_BADGE_OPTIONS.find((option) => {
    if (option.promotionType !== promotionType) return false;
    if (option.promotionType === 'none') return true;
    if (option.promotionType === 'badge') {
      return normalizePromotionLabel(option.promotionLabel) === promotionLabel;
    }
    return (
      Number(option.promotionValue || 0) === Number(promotionValue || 0) &&
      normalizePromotionLabel(option.promotionLabel) === promotionLabel
    );
  });

  return matchedOption?.value || 'custom';
};

export const emptyProductForm = {
  name: '',
  description: '',
  price: '',
  categoryId: '',
  unit: 'kg',
  stock: '',
  lowStockThreshold: '5',
  promotionType: 'none',
  promotionValue: '',
  promotionLabel: '',
  isFeatured: false,
  imageUrl: '',
  imageFile: null,
  imageDataUrl: '',
};

export const textInputClass =
  'w-full rounded-2xl border border-[color:var(--line-strong)] bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100';

export const breakAnywhereClass = 'break-words [overflow-wrap:anywhere]';
