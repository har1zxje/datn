import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BellRing,
  Bot,
  CircleDollarSign,
  ClipboardList,
  Edit3,
  Eye,
  ImagePlus,
  LayoutDashboard,
  Loader2,
  PackagePlus,
  QrCode,
  RefreshCcw,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  UsersRound,
  Warehouse,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  addProduct,
  addStockTransaction,
  deleteProduct,
  deleteUser,
  exportStockTransactionsExcel,
  getAdminFeedbackEvents,
  getAdminPaymentQRCode,
  getAdminStats,
  getAdminUsersPage,
  getCategories,
  getProducts,
  getStockTransactionsPage,
  importStockTransactionsExcel,
  markAdminFeedbackRead,
  updateAdminPaymentQRCode,
  updateProduct,
  updateUserRole,
} from '../services/api';
import OrderManagementPanel from '../components/admin/OrderManagementPanel';
import AdminShell from '../components/admin/AdminShell';
import AIFeedbackPanel from '../components/admin/AIFeedbackPanel';
import { buildCategoryDirectory, mapProductToCategoryId } from '../data/categorySystem';
import { safeText } from '../utils/text';

const TAB_DEFINITIONS = [
  { key: 'overview', label: 'Tong quan', icon: LayoutDashboard },
  { key: 'users', label: 'Nguoi dung', icon: UsersRound },
  { key: 'orders', label: 'Don hang', icon: ClipboardList },
  { key: 'products', label: 'San pham', icon: PackagePlus },
  { key: 'warehouse', label: 'Kho hang', icon: Warehouse },
  { key: 'feedback', label: 'AI feedback', icon: Bot },
  { key: 'settings', label: 'Cai dat', icon: Settings2 },
];

const STAFF_TABS = new Set(['orders', 'products', 'warehouse']);
const PAGE_SIZE = 8;

const PAGE_COPY = {
  overview: {
    title: 'Dashboard dieu hanh',
    subtitle: 'Theo doi doanh thu, don moi, ton kho can xu ly va AI feedback trong mot bo cuc gon hon.',
  },
  users: {
    title: 'Quan ly nguoi dung',
    subtitle: 'Tim nhanh, phan trang va cap nhat vai tro ma khong lam dai man hinh.',
  },
  orders: {
    title: 'Van hanh don hang',
    subtitle: 'Theo doi, loc va cap nhat trang thai don hang cho ca admin va nhan vien.',
  },
  products: {
    title: 'Danh muc san pham',
    subtitle: 'Xem, tim kiem, loc, phan trang va chinh sua thong tin san pham dang ban.',
  },
  warehouse: {
    title: 'Kho hang va danh muc',
    subtitle: 'Them va xoa san pham, ghi nhan xuat nhap kho, theo doi ton kho va xu ly file Excel.',
  },
  feedback: {
    title: 'AI feedback',
    subtitle: 'Danh sach da duoc nen gon de doc tong quan nhanh, bam vao tung muc de xem day du.',
  },
  settings: {
    title: 'Cai dat thanh toan',
    subtitle: 'Chi admin moi co the cap nhat anh ma QR thanh toan hien thi cho he thong.',
  },
};

const textInputClass =
  'w-full rounded-2xl border border-[color:var(--line-strong)] bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100';
const breakAnywhereClass = 'break-words [overflow-wrap:anywhere]';

const emptyProductForm = {
  name: '',
  description: '',
  price: '',
  categoryId: '',
  unit: 'kg',
  stock: '',
  lowStockThreshold: '5',
  imageUrl: '',
  imageFile: null,
  imageDataUrl: '',
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')} VND`;
const formatCompactNumber = (value) => Number(value || 0).toLocaleString('vi-VN');
const formatDateTime = (value) => {
  if (!value) return 'Chua co';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Chua co' : parsed.toLocaleString('vi-VN');
};
const sanitizeDigits = (raw) => String(raw || '').replace(/[^\d]/g, '');
const formatPriceInput = (digits) => (digits ? `${Number(digits).toLocaleString('vi-VN')} VND` : '');
const downloadBlobFile = (blob, filename) => {
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename || 'download.xlsx';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 300);
};

const getRoleLabel = (item) => {
  if (item?.is_admin) return 'Quan tri vien';
  if (item?.role === 'staff') return 'Nhan vien';
  return 'Nguoi dung';
};

const getRoleBadgeClass = (item) => {
  if (item?.is_admin) return 'bg-emerald-100 text-emerald-800';
  if (item?.role === 'staff') return 'bg-sky-100 text-sky-800';
  return 'bg-slate-100 text-slate-600';
};

const getStockBadge = (qty, threshold) => {
  if (qty <= 0) return { label: 'Het hang', className: 'bg-rose-100 text-rose-700' };
  if (qty <= threshold) return { label: 'Sap het', className: 'bg-amber-100 text-amber-800' };
  return { label: 'On dinh', className: 'bg-emerald-100 text-emerald-700' };
};

const buildProductPayload = (formState, categoryDirectory, { includeStock = true } = {}) => {
  const targetCategory = categoryDirectory.find((item) => String(item.id) === String(formState.categoryId));
  const formData = new FormData();

  formData.append('name', formState.name.trim());
  formData.append('description', formState.description.trim());
  formData.append('price', String(Number(formState.price || 0)));
  formData.append('unit', formState.unit || 'kg');
  formData.append('low_stock_threshold', String(Number(formState.lowStockThreshold || 5)));
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

const normalizeText = (value) =>
  safeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const paginateItems = (items, page, pageSize = PAGE_SIZE) => {
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

const OverviewMetricCard = ({ label, value, hint, icon: Icon, tone }) => {
  const toneMap = {
    emerald: 'border-emerald-200 bg-emerald-50',
    amber: 'border-amber-200 bg-amber-50',
    sky: 'border-sky-200 bg-sky-50',
    slate: 'border-slate-200 bg-slate-50',
  };

  return (
    <article className={`rounded-[30px] border p-5 shadow-[var(--shadow-soft)] ${toneMap[tone] || toneMap.slate}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{hint}</p>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
          <Icon size={20} />
        </span>
      </div>
    </article>
  );
};

const PaginationControls = ({ page, totalPages, total, onPageChange }) => {
  if (!total || totalPages <= 1) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-[color:var(--line-soft)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Tong <span className="font-semibold text-slate-900">{total}</span> muc, trang {page}/{totalPages}
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-2xl border border-[color:var(--line-strong)] px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Truoc
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-2xl border border-[color:var(--line-strong)] px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Sau
        </button>
      </div>
    </div>
  );
};

const EmptyState = ({ title, description }) => (
  <div className="rounded-[30px] border border-dashed border-slate-200 bg-white p-10 text-center shadow-[var(--shadow-soft)]">
    <p className="text-base font-bold text-slate-900">{title}</p>
    <p className="mt-2 text-sm text-slate-500">{description}</p>
  </div>
);

const ProductPreviewModal = ({ product, categoryLabel, onClose }) => {
  if (!product) return null;

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-[32px] border border-white/70 bg-[rgba(255,255,255,0.98)] p-6 shadow-[var(--shadow-overlay)] md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Product preview</p>
            <h3 className="mt-2 text-2xl font-black text-slate-950">{product.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{categoryLabel || 'Khac'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="overflow-hidden rounded-[28px] bg-slate-100">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="h-full min-h-[260px] w-full object-cover" />
            ) : (
              <div className="flex h-[260px] items-center justify-center text-slate-400">
                <ImagePlus size={28} />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-[color:var(--line-soft)] bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gia ban</p>
              <p className="mt-2 text-2xl font-black text-emerald-700">{formatMoney(product.price)}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[28px] border border-[color:var(--line-soft)] bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ton kho</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{Number(product.quantity ?? product.stock ?? 0)}</p>
              </div>
              <div className="rounded-[28px] border border-[color:var(--line-soft)] bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Don vi</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{safeText(product.unit, 'kg')}</p>
              </div>
            </div>

            <div className="rounded-[28px] border border-[color:var(--line-soft)] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mo ta</p>
              <p className={`mt-3 text-sm leading-7 text-slate-600 ${breakAnywhereClass}`}>
                {safeText(product.description, 'Chua co mo ta cho san pham nay.')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PaymentQRCodePanel = ({
  paymentQr,
  draft,
  loading,
  saving,
  onProviderChange,
  onFileChange,
  onRefresh,
  onSave,
}) => (
  <section className="space-y-6">
    <div className="overflow-hidden rounded-[30px] border border-[color:var(--line-soft)] bg-white shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-4 border-b border-[color:var(--line-soft)] bg-[linear-gradient(135deg,rgba(15,154,98,0.12),rgba(216,169,52,0.10),rgba(255,255,255,0.96))] p-5 lg:flex-row lg:items-start lg:justify-between md:p-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">QR Payment</p>
          <h2 className="mt-2 text-xl font-black text-slate-950">Cap nhat ma QR thanh toan</h2>
          <p className="mt-1 text-sm text-slate-500">
            Chi admin moi thay tab nay. Anh QR moi se thay the anh hien tai sau khi bam luu.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--line-strong)] bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition hover:bg-slate-50"
        >
          <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
          Tai lai
        </button>
      </div>
    </div>

    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-[30px] border border-[color:var(--line-soft)] bg-white p-6 shadow-[var(--shadow-soft)]">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Xem truoc hien tai</p>
        <div className="mt-4 overflow-hidden rounded-[28px] border border-dashed border-slate-300 bg-slate-50">
          {draft.preview ? (
            <img src={draft.preview} alt="Payment QR preview" className="aspect-square w-full object-contain bg-white p-4" />
          ) : (
            <div className="flex aspect-square items-center justify-center text-slate-400">
              <div className="text-center">
                <QrCode size={34} className="mx-auto" />
                <p className="mt-3 text-sm">Chua co anh QR</p>
              </div>
            </div>
          )}
        </div>
        <div className="mt-4 rounded-[26px] bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">{draft.provider_name || paymentQr?.provider_name || 'Chuyen khoan'}</p>
          <p className="mt-1">Cap nhat luc: {paymentQr?.updated_at ? formatDateTime(paymentQr.updated_at) : 'Chua co'}</p>
        </div>
      </div>

      <form
        onSubmit={onSave}
        className="rounded-[30px] border border-[color:var(--line-soft)] bg-white p-6 shadow-[var(--shadow-soft)]"
      >
        <div className="space-y-5">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ten kenh thanh toan</span>
            <input
              value={draft.provider_name}
              onChange={(event) => onProviderChange(event.target.value)}
              className={textInputClass}
              placeholder="Chuyen khoan, MoMo, ZaloPay..."
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tai anh ma QR</span>
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
              <input
                id="payment-qr-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileChange}
              />
              <p className="text-sm font-semibold text-slate-700">Chon anh moi de thay the ma QR hien tai.</p>
              <label
                htmlFor="payment-qr-input"
                className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)]"
              >
                <ImagePlus size={16} />
                Chon anh
              </label>
            </div>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(5,150,105,0.22)] disabled:opacity-70"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
            Luu ma QR
          </button>
        </div>
      </form>
    </div>
  </section>
);

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { section } = useParams();
  const isStaff = user?.role === 'staff';
  const defaultTab = isStaff ? 'orders' : 'overview';
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('nutrigro-admin-sidebar') === 'collapsed';
  });

  const [loading, setLoading] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [stockHistoryLoading, setStockHistoryLoading] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [paymentQrLoading, setPaymentQrLoading] = useState(false);
  const [paymentQrSaving, setPaymentQrSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [usersData, setUsersData] = useState({ items: [], total: 0, page: 1, limit: 12, total_pages: 1, has_next: false });
  const [stockHistoryData, setStockHistoryData] = useState({ items: [], total: 0, page: 1, limit: 8, total_pages: 1, has_next: false });
  const [feedbackData, setFeedbackData] = useState({
    items: [],
    total: 0,
    unread_count: 0,
    page: 1,
    limit: 10,
    total_pages: 1,
    has_next: false,
  });
  const [paymentQr, setPaymentQr] = useState(null);
  const [paymentQrDraft, setPaymentQrDraft] = useState({
    provider_name: 'Chuyen khoan',
    file: null,
    preview: '',
  });
  const [orderRefreshNonce, setOrderRefreshNonce] = useState(0);

  const [userFilters, setUserFilters] = useState({ search: '', role: 'all', page: 1, limit: 10 });
  const [feedbackFilters, setFeedbackFilters] = useState({ status: 'unread', search: '', page: 1, limit: 10 });
  const [stockHistoryFilters, setStockHistoryFilters] = useState({ search: '', type: 'all', page: 1, limit: 8 });

  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productStockFilter, setProductStockFilter] = useState('all');
  const [productPage, setProductPage] = useState(1);

  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryStockFilter, setInventoryStockFilter] = useState('all');
  const [inventoryPage, setInventoryPage] = useState(1);

  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUserRole, setEditingUserRole] = useState('customer');

  const [selectedProductPreview, setSelectedProductPreview] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [imagePreview, setImagePreview] = useState('');
  const [isImageProcessing, setIsImageProcessing] = useState(false);

  const [warehouseForm, setWarehouseForm] = useState({
    productId: '',
    type: 'import',
    quantity: '',
    note: '',
    date: todayISO(),
  });
  const [warehouseExcelFile, setWarehouseExcelFile] = useState(null);
  const [warehouseExcelInputKey, setWarehouseExcelInputKey] = useState(0);
  const [warehouseExcelLoading, setWarehouseExcelLoading] = useState(false);
  const [markingFeedbackId, setMarkingFeedbackId] = useState(null);

  const categoryDirectory = useMemo(() => buildCategoryDirectory(categories), [categories]);

  const unreadFeedbackCount = stats?.unread_feedback_count ?? feedbackData.unread_count ?? 0;
  const visibleTabs = useMemo(() => {
    const baseTabs = isStaff ? TAB_DEFINITIONS.filter((tab) => STAFF_TABS.has(tab.key)) : TAB_DEFINITIONS;
    return baseTabs.map((tab) => (tab.key === 'feedback' ? { ...tab, badge: unreadFeedbackCount } : tab));
  }, [isStaff, unreadFeedbackCount]);

  const activeTab = useMemo(() => {
    if (!section) return defaultTab;
    return visibleTabs.some((tab) => tab.key === section) ? section : defaultTab;
  }, [defaultTab, section, visibleTabs]);

  const activeTabCopy = PAGE_COPY[activeTab] || PAGE_COPY.orders;
  const isRefreshing =
    loading ||
    overviewLoading ||
    catalogLoading ||
    usersLoading ||
    stockHistoryLoading ||
    warehouseExcelLoading ||
    feedbackLoading ||
    paymentQrLoading ||
    paymentQrSaving;

  const filteredProducts = useMemo(() => {
    const searchToken = normalizeText(productSearch);
    return products.filter((product) => {
      const categoryId = mapProductToCategoryId(product, categoryDirectory);
      const qty = Number(product.quantity ?? product.stock ?? 0);
      const threshold = Number(product.low_stock_threshold ?? 5);
      const stockState = qty <= 0 ? 'out' : qty <= threshold ? 'low' : 'ok';
      const matchesCategory = productCategoryFilter === 'all' || String(categoryId) === String(productCategoryFilter);
      const matchesStock = productStockFilter === 'all' || stockState === productStockFilter;
      const haystack = normalizeText(
        [product.name, product.description, product.category, product.category_name]
          .filter(Boolean)
          .join(' ')
      );
      const matchesSearch = !searchToken || haystack.includes(searchToken);
      return matchesCategory && matchesStock && matchesSearch;
    });
  }, [productCategoryFilter, productSearch, productStockFilter, products, categoryDirectory]);

  const paginatedProducts = useMemo(
    () => paginateItems(filteredProducts, productPage, PAGE_SIZE),
    [filteredProducts, productPage],
  );

  const filteredInventoryProducts = useMemo(() => {
    const searchToken = normalizeText(inventorySearch);
    return products.filter((product) => {
      const qty = Number(product.quantity ?? product.stock ?? 0);
      const threshold = Number(product.low_stock_threshold ?? 5);
      const stockState = qty <= 0 ? 'out' : qty <= threshold ? 'low' : 'ok';
      const haystack = normalizeText(
        [product.name, product.description, product.category, product.category_name]
          .filter(Boolean)
          .join(' ')
      );
      const matchesSearch = !searchToken || haystack.includes(searchToken);
      const matchesStock = inventoryStockFilter === 'all' || stockState === inventoryStockFilter;
      return matchesSearch && matchesStock;
    });
  }, [inventorySearch, inventoryStockFilter, products]);

  const paginatedInventory = useMemo(
    () => paginateItems(filteredInventoryProducts, inventoryPage, PAGE_SIZE),
    [filteredInventoryProducts, inventoryPage],
  );

  const warehouseProductOptions = useMemo(
    () => [...products].sort((a, b) => safeText(a.name).localeCompare(safeText(b.name), 'vi')),
    [products],
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('nutrigro-admin-sidebar', sidebarCollapsed ? 'collapsed' : 'expanded');
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!section || !visibleTabs.some((tab) => tab.key === section)) {
      navigate(`/admin/dashboard/${defaultTab}`, { replace: true });
    }
  }, [defaultTab, navigate, section, visibleTabs]);

  useEffect(() => {
    setProductPage(1);
  }, [productCategoryFilter, productSearch, productStockFilter]);

  useEffect(() => {
    setInventoryPage(1);
  }, [inventorySearch, inventoryStockFilter]);

  const showError = (error, fallback) => {
    const detail = safeText(error?.detail || error?.message, fallback);
    setMessage({ type: 'error', text: detail });
  };

  const loadOverview = async ({ silent = false } = {}) => {
    if (isStaff) return null;
    if (!silent) {
      setOverviewLoading(true);
      setMessage(null);
    }

    try {
      const payload = await getAdminStats();
      setStats(payload);
      return payload;
    } catch (error) {
      showError(error, 'Khong the tai thong ke dashboard.');
      return null;
    } finally {
      if (!silent) setOverviewLoading(false);
    }
  };

  const loadCatalog = async ({ silent = false } = {}) => {
    if (!silent) {
      setCatalogLoading(true);
      setMessage(null);
    }

    try {
      const [productData, categoryData] = await Promise.all([
        getProducts({ limit: 300, sort_by: 'name' }),
        getCategories(),
      ]);
      setProducts(productData);
      setCategories(categoryData);
      return { productData, categoryData };
    } catch (error) {
      showError(error, 'Khong the tai danh muc san pham.');
      return null;
    } finally {
      if (!silent) setCatalogLoading(false);
    }
  };

  const loadUsers = async (nextFilters = userFilters, { silent = false } = {}) => {
    if (isStaff) return null;
    if (!silent) {
      setUsersLoading(true);
      setMessage(null);
    }

    try {
      const payload = await getAdminUsersPage(nextFilters);
      setUsersData(payload);
      return payload;
    } catch (error) {
      showError(error, 'Khong the tai danh sach nguoi dung.');
      return null;
    } finally {
      if (!silent) setUsersLoading(false);
    }
  };

  const loadStockHistory = async (nextFilters = stockHistoryFilters, { silent = false } = {}) => {
    if (!silent) {
      setStockHistoryLoading(true);
      setMessage(null);
    }

    try {
      const payload = await getStockTransactionsPage(nextFilters);
      setStockHistoryData(payload);
      return payload;
    } catch (error) {
      showError(error, 'Khong the tai lich su giao dich kho.');
      return null;
    } finally {
      if (!silent) setStockHistoryLoading(false);
    }
  };

  const loadFeedback = async (nextFilters = feedbackFilters, { silent = false } = {}) => {
    if (isStaff) return null;
    if (!silent) {
      setFeedbackLoading(true);
      setMessage(null);
    }

    try {
      const payload = await getAdminFeedbackEvents(nextFilters);
      setFeedbackData(payload);
      return payload;
    } catch (error) {
      showError(error, 'Khong the tai AI feedback.');
      return null;
    } finally {
      if (!silent) setFeedbackLoading(false);
    }
  };

  const loadPaymentQr = async ({ silent = false } = {}) => {
    if (isStaff) return null;
    if (!silent) {
      setPaymentQrLoading(true);
      setMessage(null);
    }

    try {
      const payload = await getAdminPaymentQRCode();
      setPaymentQr(payload);
      setPaymentQrDraft({
        provider_name: payload?.provider_name || 'Chuyen khoan',
        file: null,
        preview: payload?.image_url || '',
      });
      return payload;
    } catch (error) {
      showError(error, 'Khong the tai ma QR thanh toan.');
      return null;
    } finally {
      if (!silent) setPaymentQrLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (activeTab === 'overview' && !isStaff) loadOverview();
    if ((activeTab === 'products' || activeTab === 'warehouse') && products.length === 0) loadCatalog();
    if (activeTab === 'settings' && !isStaff) loadPaymentQr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user?.id]);

  useEffect(() => {
    if (!user || isStaff || activeTab !== 'users') return;
    loadUsers(userFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user?.id, userFilters.page, userFilters.limit, userFilters.role, userFilters.search, isStaff]);

  useEffect(() => {
    if (!user || activeTab !== 'warehouse') return;
    loadStockHistory(stockHistoryFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    user?.id,
    stockHistoryFilters.page,
    stockHistoryFilters.limit,
    stockHistoryFilters.search,
    stockHistoryFilters.type,
  ]);

  useEffect(() => {
    if (!user || isStaff || activeTab !== 'feedback') return;
    loadFeedback(feedbackFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    user?.id,
    feedbackFilters.page,
    feedbackFilters.limit,
    feedbackFilters.search,
    feedbackFilters.status,
    isStaff,
  ]);

  const handleRefreshActiveTab = async () => {
    if (activeTab === 'overview') await loadOverview();
    if (activeTab === 'users') await loadUsers(userFilters);
    if (activeTab === 'products') await loadCatalog();
    if (activeTab === 'warehouse') {
      await Promise.all([loadCatalog(), loadStockHistory(stockHistoryFilters)]);
    }
    if (activeTab === 'feedback') await loadFeedback(feedbackFilters);
    if (activeTab === 'settings') await loadPaymentQr();
    if (activeTab === 'orders') setOrderRefreshNonce((prev) => prev + 1);
  };

  const resetProductForm = () => {
    setProductForm(emptyProductForm);
    setImagePreview('');
    setEditingProductId(null);
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    resetProductForm();
  };

  const openCreateProductModal = () => {
    resetProductForm();
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (product) => {
    const mappedCategoryId = mapProductToCategoryId(product, categoryDirectory);
    setEditingProductId(product.id);
    setProductForm({
      name: product.name || '',
      description: product.description || '',
      price: String(Number(product.price || 0)),
      categoryId: mappedCategoryId || '',
      unit: product.unit || 'kg',
      stock: String(product.stock ?? product.quantity ?? 0),
      lowStockThreshold: String(product.low_stock_threshold ?? 5),
      imageUrl: product.image_url || product.img || '',
      imageFile: null,
      imageDataUrl: '',
    });
    setImagePreview(product.image_url || product.img || '');
    setIsProductModalOpen(true);
  };

  const openProductPreview = (product) => {
    setSelectedProductPreview(product);
  };

  const closeProductPreview = () => {
    setSelectedProductPreview(null);
  };

  const handleAdminImageUpload = (event) => {
    const localFile = event?.target?.files?.[0];
    if (!localFile || !localFile.type?.startsWith('image/')) return;

    setIsImageProcessing(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const nextImage = typeof reader.result === 'string' ? reader.result : '';
      setImagePreview(nextImage);
      setProductForm((prev) => ({
        ...prev,
        imageFile: localFile,
        imageDataUrl: nextImage,
        imageUrl: '',
      }));
      setIsImageProcessing(false);
    };
    reader.onerror = () => {
      setIsImageProcessing(false);
      setMessage({ type: 'error', text: 'Khong the doc tep anh. Vui long thu lai.' });
    };
    reader.readAsDataURL(localFile);
  };

  const handleSaveProduct = async (event) => {
    event.preventDefault();
    if (isImageProcessing) {
      setMessage({ type: 'error', text: 'Anh dang duoc xu ly. Vui long doi.' });
      return;
    }
    if (!productForm.name.trim()) {
      setMessage({ type: 'error', text: 'Ten san pham khong duoc de trong.' });
      return;
    }
    if (!productForm.categoryId) {
      setMessage({ type: 'error', text: 'Vui long chon danh muc.' });
      return;
    }
    if (!productForm.price || Number(productForm.price) <= 0) {
      setMessage({ type: 'error', text: 'Gia san pham phai lon hon 0.' });
      return;
    }

    const trimmedName = productForm.name.trim().toLowerCase();
    const duplicate = products.find(
      (item) => item.name.trim().toLowerCase() === trimmedName && item.id !== editingProductId,
    );
    if (duplicate) {
      setMessage({ type: 'error', text: `Ten san pham "${productForm.name.trim()}" da ton tai.` });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const payload = buildProductPayload(productForm, categoryDirectory, {
        includeStock: !editingProductId,
      });
      if (editingProductId) {
        await updateProduct(editingProductId, payload);
      } else {
        await addProduct(payload);
      }

      await Promise.all([
        loadCatalog({ silent: true }),
        activeTab === 'warehouse' ? loadStockHistory(stockHistoryFilters, { silent: true }) : Promise.resolve(),
        !isStaff ? loadOverview({ silent: true }) : Promise.resolve(),
      ]);
      setMessage({
        type: 'success',
        text: editingProductId ? 'Cap nhat san pham thanh cong.' : 'Them san pham thanh cong.',
      });
      closeProductModal();
    } catch (error) {
      showError(error, 'Khong the luu san pham.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProductItem = async (productId, productName) => {
    if (!window.confirm(`Xoa san pham ${productName}?`)) return;

    setLoading(true);
    setMessage(null);
    try {
      await deleteProduct(productId);
      await Promise.all([
        loadCatalog({ silent: true }),
        activeTab === 'warehouse' ? loadStockHistory(stockHistoryFilters, { silent: true }) : Promise.resolve(),
        !isStaff ? loadOverview({ silent: true }) : Promise.resolve(),
      ]);
      setMessage({ type: 'success', text: 'Da xoa san pham.' });
    } catch (error) {
      showError(error, 'Khong the xoa san pham.');
    } finally {
      setLoading(false);
    }
  };

  const startEditUserRole = (targetUser) => {
    setEditingUserId(targetUser.id);
    setEditingUserRole(targetUser.role || (targetUser.is_admin ? 'admin' : 'customer'));
  };

  const handleSaveUserRole = async (targetUser) => {
    setLoading(true);
    setMessage(null);
    try {
      await updateUserRole(targetUser.id, editingUserRole);
      setEditingUserId(null);
      await Promise.all([loadUsers(userFilters, { silent: true }), loadOverview({ silent: true })]);
      setMessage({ type: 'success', text: 'Da cap nhat vai tro nguoi dung.' });
    } catch (error) {
      showError(error, 'Khong the cap nhat vai tro.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (!window.confirm(`Xoa nguoi dung ${targetUser.username}?`)) return;

    setLoading(true);
    setMessage(null);
    try {
      await deleteUser(targetUser.id);
      await Promise.all([loadUsers(userFilters, { silent: true }), loadOverview({ silent: true })]);
      setMessage({ type: 'success', text: 'Da xoa nguoi dung.' });
    } catch (error) {
      showError(error, 'Khong the xoa nguoi dung.');
    } finally {
      setLoading(false);
    }
  };

  const handleWarehouseSubmit = async (event) => {
    event.preventDefault();

    const qty = Number(warehouseForm.quantity);
    const selectedProduct = products.find((item) => String(item.id) === String(warehouseForm.productId));
    if (!warehouseForm.productId) {
      setMessage({ type: 'error', text: 'Vui long chon san pham.' });
      return;
    }
    if (!qty || qty < 1) {
      setMessage({ type: 'error', text: 'So luong phai lon hon 0.' });
      return;
    }
    if (
      warehouseForm.type === 'export' &&
      selectedProduct &&
      qty > Number(selectedProduct.quantity ?? selectedProduct.stock ?? 0)
    ) {
      setMessage({
        type: 'error',
        text: `Khong the xuat ${qty} san pham khi ton kho hien tai chi con ${Number(selectedProduct.quantity ?? selectedProduct.stock ?? 0)}.`,
      });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      await addStockTransaction({
        product_id: Number(warehouseForm.productId),
        type: warehouseForm.type,
        quantity: qty,
        note: warehouseForm.note,
        transaction_date: warehouseForm.date ? `${warehouseForm.date}T00:00:00` : null,
      });

      await Promise.all([
        loadCatalog({ silent: true }),
        loadStockHistory(stockHistoryFilters, { silent: true }),
        !isStaff ? loadOverview({ silent: true }) : Promise.resolve(),
      ]);
      setWarehouseForm({ productId: '', type: 'import', quantity: '', note: '', date: todayISO() });
      setMessage({
        type: 'success',
        text: `${warehouseForm.type === 'export' ? 'Xuat' : 'Nhap'} kho thanh cong.`,
      });
    } catch (error) {
      showError(error, 'Khong the ghi giao dich kho.');
    } finally {
      setLoading(false);
    }
  };

  const handleWarehouseExcelFileChange = (event) => {
    const nextFile = event?.target?.files?.[0] || null;
    setWarehouseExcelFile(nextFile);
  };

  const handleExportWarehouseExcel = async () => {
    setWarehouseExcelLoading(true);
    setMessage(null);
    try {
      const { blob, filename } = await exportStockTransactionsExcel({
        ...(stockHistoryFilters.search ? { search: stockHistoryFilters.search } : {}),
        ...(stockHistoryFilters.type && stockHistoryFilters.type !== 'all' ? { type: stockHistoryFilters.type } : {}),
      });
      downloadBlobFile(blob, filename);
      setMessage({ type: 'success', text: 'Da xuat file Excel giao dich kho.' });
    } catch (error) {
      showError(error, 'Khong the xuat file Excel giao dich kho.');
    } finally {
      setWarehouseExcelLoading(false);
    }
  };

  const handleImportWarehouseExcel = async () => {
    if (!warehouseExcelFile) {
      setMessage({ type: 'error', text: 'Vui long chon file Excel .xlsx de nhap kho.' });
      return;
    }
    if (!/\.xlsx$/i.test(warehouseExcelFile.name || '')) {
      setMessage({ type: 'error', text: 'Chi ho tro file Excel dinh dang .xlsx.' });
      return;
    }

    setWarehouseExcelLoading(true);
    setMessage(null);
    try {
      const result = await importStockTransactionsExcel(warehouseExcelFile);
      await Promise.all([
        loadCatalog({ silent: true }),
        loadStockHistory(stockHistoryFilters, { silent: true }),
        !isStaff ? loadOverview({ silent: true }) : Promise.resolve(),
      ]);
      setWarehouseExcelFile(null);
      setWarehouseExcelInputKey((prev) => prev + 1);
      setMessage({
        type: 'success',
        text: `Da nhap ${formatCompactNumber(result.imported_count || 0)} giao dich tu file Excel.`,
      });
    } catch (error) {
      showError(error, 'Khong the nhap file Excel giao dich kho.');
    } finally {
      setWarehouseExcelLoading(false);
    }
  };

  const handleMarkFeedbackRead = async (feedbackId) => {
    setMarkingFeedbackId(feedbackId);
    setMessage(null);
    try {
      await markAdminFeedbackRead(feedbackId);
      await Promise.all([
        loadFeedback(feedbackFilters, { silent: true }),
        loadOverview({ silent: true }),
      ]);
      setMessage({ type: 'success', text: 'Da danh dau feedback la da doc.' });
    } catch (error) {
      showError(error, 'Khong the cap nhat trang thai feedback.');
    } finally {
      setMarkingFeedbackId(null);
    }
  };

  const handlePaymentQrFileChange = (event) => {
    const localFile = event?.target?.files?.[0];
    if (!localFile || !localFile.type?.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const preview = typeof reader.result === 'string' ? reader.result : '';
      setPaymentQrDraft((prev) => ({
        ...prev,
        file: localFile,
        preview,
      }));
    };
    reader.readAsDataURL(localFile);
  };

  const handleSavePaymentQr = async (event) => {
    event.preventDefault();
    if (!paymentQrDraft.provider_name.trim()) {
      setMessage({ type: 'error', text: 'Vui long nhap ten kenh thanh toan.' });
      return;
    }

    setPaymentQrSaving(true);
    setMessage(null);
    try {
      const payload = await updateAdminPaymentQRCode({
        provider_name: paymentQrDraft.provider_name.trim(),
        image_file: paymentQrDraft.file,
      });
      setPaymentQr(payload);
      setPaymentQrDraft({
        provider_name: payload.provider_name,
        file: null,
        preview: payload.image_url,
      });
      setMessage({ type: 'success', text: 'Da cap nhat ma QR thanh toan.' });
    } catch (error) {
      showError(error, 'Khong the cap nhat ma QR thanh toan.');
    } finally {
      setPaymentQrSaving(false);
    }
  };

  const renderOverview = () => {
    const lowStockItems = stats?.low_stock_items || [];
    const recentFeedback = stats?.recent_feedback || [];

    return (
      <section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <OverviewMetricCard
            label="Doanh thu hom nay"
            value={formatMoney(stats?.today_revenue ?? 0)}
            hint={`${formatCompactNumber(stats?.total_revenue ?? 0)} VND tong doanh thu he thong`}
            icon={CircleDollarSign}
            tone="emerald"
          />
          <OverviewMetricCard
            label="Don moi"
            value={formatCompactNumber(stats?.new_orders_today ?? 0)}
            hint={`${formatCompactNumber(stats?.pending_orders ?? 0)} don dang cho xu ly`}
            icon={ClipboardList}
            tone="sky"
          />
          <OverviewMetricCard
            label="San pham sap het"
            value={formatCompactNumber(stats?.low_stock_products ?? 0)}
            hint="So san pham co ton kho <= nguong canh bao"
            icon={TriangleAlert}
            tone="amber"
          />
          <OverviewMetricCard
            label="AI feedback chua doc"
            value={formatCompactNumber(unreadFeedbackCount)}
            hint={`${formatCompactNumber(recentFeedback.length)} feedback gan day trong preview`}
            icon={BellRing}
            tone="slate"
          />
        </div>

        <div className="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[30px] border border-[color:var(--line-soft)] bg-white p-5 shadow-[var(--shadow-soft)] md:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Canh bao ton kho</p>
                <h2 className="mt-2 text-xl font-black text-slate-950">San pham can uu tien bo sung</h2>
              </div>
              <button
                type="button"
                onClick={() => navigateToTab('warehouse')}
                    className="rounded-2xl border border-[color:var(--line-strong)] px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Mo kho hang
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              {lowStockItems.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                  Khong co san pham nao dang sap het hang.
                </div>
              ) : (
                lowStockItems.map((item) => {
                  const badge = getStockBadge(Number(item.quantity || 0), Number(item.low_stock_threshold || 0));
                  return (
                    <div key={item.id} className="flex items-center gap-4 rounded-[24px] border border-[color:var(--line-soft)] bg-slate-50 p-4">
                      <div className="h-16 w-16 overflow-hidden rounded-2xl bg-white">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <ImagePlus size={18} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-950">{item.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.category_name || 'Khac'}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
                            {badge.label}
                          </span>
                          <span className="text-xs text-slate-500">
                            Ton: <span className="font-bold text-slate-900">{item.quantity}</span> / Nguong {item.low_stock_threshold}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[30px] border border-[color:var(--line-soft)] bg-white p-5 shadow-[var(--shadow-soft)] md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">AI preview</p>
                  <h2 className="mt-2 text-xl font-black text-slate-950">Feedback moi can doc</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackFilters((prev) => ({ ...prev, status: 'unread', page: 1 }));
                    navigateToTab('feedback');
                  }}
                  className="rounded-2xl border border-[color:var(--line-strong)] px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Mo feedback
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {recentFeedback.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                    Chua co phan hoi AI moi.
                  </div>
                ) : (
                  recentFeedback.map((feedback) => (
                    <button
                      key={feedback.id}
                      type="button"
                      onClick={() => {
                        setFeedbackFilters((prev) => ({ ...prev, status: feedback.is_read ? 'read' : 'unread', page: 1 }));
                        navigateToTab('feedback');
                      }}
                      className="w-full rounded-[24px] border border-[color:var(--line-soft)] bg-slate-50 p-4 text-left transition hover:border-emerald-200 hover:bg-emerald-50/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-950">{feedback.predicted_label}</p>
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
                      <p className="mt-3 text-sm text-slate-600">
                        {feedback.is_correct
                          ? 'Nguoi dung xac nhan ket qua AI la dung.'
                          : `Nguoi dung de nghi sua thanh "${feedback.corrected_label || 'khac'}".`}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[30px] border border-[color:var(--line-soft)] bg-white p-5 shadow-[var(--shadow-soft)] md:p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Tong quan he thong</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nguoi dung</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">{formatCompactNumber(stats?.total_users ?? 0)}</p>
                </div>
                <div className="rounded-[24px] bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tong don hang</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">{formatCompactNumber(stats?.total_orders ?? 0)}</p>
                </div>
                <div className="rounded-[24px] bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tong san pham</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">{formatCompactNumber(stats?.total_products ?? 0)}</p>
                </div>
                <div className="rounded-[24px] bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trang thai</p>
                  <p className="mt-2 text-2xl font-black text-emerald-700">{safeText(stats?.system_status, 'On dinh')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  const renderUsers = () => (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[30px] border border-[color:var(--line-soft)] bg-white shadow-[var(--shadow-soft)]">
        <div className="bg-[linear-gradient(135deg,rgba(15,154,98,0.10),rgba(216,169,52,0.08),rgba(255,255,255,0.96))] p-5 md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">User Directory</p>
            <h2 className="mt-2 text-xl font-black text-slate-950">Danh sach nguoi dung</h2>
            <p className="mt-1 text-sm text-slate-500">Bo loc va phan trang duoc dua len dau de tranh bang qua dai.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[520px]">
            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tim kiem</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  value={userFilters.search}
                  onChange={(event) => setUserFilters((prev) => ({ ...prev, search: event.target.value, page: 1 }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Username, email, ho ten..."
                />
              </div>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vai tro</span>
              <select
                value={userFilters.role}
                onChange={(event) => setUserFilters((prev) => ({ ...prev, role: event.target.value, page: 1 }))}
                className={textInputClass}
              >
                <option value="all">Tat ca vai tro</option>
                <option value="customer">Nguoi dung</option>
                <option value="staff">Nhan vien</option>
                <option value="admin">Quan tri vien</option>
              </select>
            </label>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tong hien thi</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{usersData.total}</p>
            </div>
          </div>
        </div>
        </div>
      </div>

      {usersLoading && usersData.items.length === 0 ? (
        <div className="rounded-[30px] border border-[color:var(--line-soft)] bg-white p-10 text-center shadow-[var(--shadow-soft)]">
          <Loader2 size={22} className="mx-auto animate-spin text-emerald-600" />
          <p className="mt-3 text-sm font-medium text-slate-500">Dang tai nguoi dung...</p>
        </div>
      ) : null}

      {!usersLoading && usersData.items.length === 0 ? (
        <EmptyState
          title="Khong tim thay nguoi dung"
          description="Thu doi tu khoa tim kiem hoac thay bo loc vai tro."
        />
      ) : null}

      <div className="grid gap-4 md:hidden">
        {usersData.items.map((item) => {
          const isEditingRole = editingUserId === item.id;
          return (
            <article key={item.id} className="rounded-[28px] border border-[color:var(--line-soft)] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-black text-slate-950">{item.username}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.email}</p>
                  <p className="mt-2 text-xs text-slate-400">Tao luc {formatDateTime(item.created_at)}</p>
                </div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRoleBadgeClass(item)}`}>
                  {getRoleLabel(item)}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {isEditingRole ? (
                  <>
                    <select
                      value={editingUserRole}
                      onChange={(event) => setEditingUserRole(event.target.value)}
                      className={textInputClass}
                    >
                      <option value="customer">Nguoi dung</option>
                      <option value="staff">Nhan vien</option>
                      <option value="admin">Quan tri vien</option>
                    </select>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleSaveUserRole(item)}
                        className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
                      >
                        Luu
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingUserId(null)}
                        className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
                      >
                        Huy
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => startEditUserRole(item)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
                  >
                    Sua vai tro
                  </button>
                )}
                {!item.is_admin && (
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(item)}
                    className="w-full rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white"
                  >
                    Xoa tai khoan
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {usersData.items.length > 0 && (
        <div className="overflow-hidden rounded-[30px] border border-[color:var(--line-soft)] bg-white shadow-[var(--shadow-soft)]">
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead className="bg-slate-50/85 text-left text-sm text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Ten dang nhap</th>
                    <th className="px-5 py-4">Email</th>
                    <th className="px-5 py-4">Vai tro</th>
                    <th className="px-5 py-4">Tao luc</th>
                    <th className="px-5 py-4 text-right">Thao tac</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {usersData.items.map((item) => {
                    const isEditingRole = editingUserId === item.id;
                    return (
                      <tr key={item.id}>
                        <td className="px-5 py-4 font-semibold text-slate-950">{item.username}</td>
                        <td className="px-5 py-4 text-slate-600">{item.email}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRoleBadgeClass(item)}`}>
                            {getRoleLabel(item)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-500">{formatDateTime(item.created_at)}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {isEditingRole ? (
                              <>
                                <select
                                  value={editingUserRole}
                                  onChange={(event) => setEditingUserRole(event.target.value)}
                                  className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                                >
                                  <option value="customer">Nguoi dung</option>
                                  <option value="staff">Nhan vien</option>
                                  <option value="admin">Quan tri vien</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleSaveUserRole(item)}
                                  className="rounded-2xl bg-emerald-600 px-4 py-2 text-white"
                                >
                                  Luu
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingUserId(null)}
                                  className="rounded-2xl border border-slate-200 px-4 py-2 text-slate-700"
                                >
                                  Huy
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => startEditUserRole(item)}
                                className="rounded-2xl border border-slate-200 px-4 py-2 text-slate-700"
                              >
                                Sua
                              </button>
                            )}
                            {!item.is_admin && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(item)}
                                className="rounded-2xl bg-rose-600 px-4 py-2 text-white"
                              >
                                Xoa
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <PaginationControls
            page={usersData.page}
            totalPages={usersData.total_pages}
            total={usersData.total}
            onPageChange={(page) => setUserFilters((prev) => ({ ...prev, page }))}
          />
        </div>
      )}
    </section>
  );

  const renderProducts = () => (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[30px] border border-[color:var(--line-soft)] bg-white shadow-[var(--shadow-soft)]">
        <div className="bg-[linear-gradient(135deg,rgba(15,154,98,0.10),rgba(216,169,52,0.08),rgba(255,255,255,0.96))] p-5 md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Catalog View</p>
            <h2 className="mt-2 text-xl font-black text-slate-950">Danh muc san pham</h2>
            <p className="mt-1 text-sm text-slate-500">
              Chinh sua duoc thuc hien tai day, con viec them san pham moi duoc giu o tab Kho hang.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[620px] xl:grid-cols-[1.4fr_1fr_1fr]">
            <label className="space-y-2 sm:col-span-2 xl:col-span-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tim kiem</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Ten, mo ta, danh muc..."
                />
              </div>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Danh muc</span>
              <select
                value={productCategoryFilter}
                onChange={(event) => setProductCategoryFilter(event.target.value)}
                className={textInputClass}
              >
                <option value="all">Tat ca danh muc</option>
                {categoryDirectory.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label || category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ton kho</span>
              <select
                value={productStockFilter}
                onChange={(event) => setProductStockFilter(event.target.value)}
                className={textInputClass}
              >
                <option value="all">Tat ca</option>
                <option value="ok">On dinh</option>
                <option value="low">Sap het</option>
                <option value="out">Het hang</option>
              </select>
            </label>
          </div>
        </div>
        </div>
      </div>

      {!catalogLoading && paginatedProducts.total === 0 ? (
        <EmptyState
          title="Khong co san pham phu hop"
          description="Thu doi tu khoa tim kiem hoac bo loc danh muc / ton kho."
        />
      ) : null}

      <div className="grid gap-4 md:hidden">
        {paginatedProducts.items.map((product) => {
          const qty = Number(product.stock ?? product.quantity ?? 0);
          const threshold = Number(product.low_stock_threshold ?? 5);
          const badge = getStockBadge(qty, threshold);
          const categoryLabel =
            categoryDirectory.find((item) => item.id === mapProductToCategoryId(product, categoryDirectory))?.label ||
            product.category ||
            'Khac';

          return (
            <article key={product.id} className="rounded-[28px] border border-[color:var(--line-soft)] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-2xl bg-slate-100">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      <ImagePlus size={18} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`line-clamp-2 text-base font-black text-slate-950 ${breakAnywhereClass}`}>{product.name}</p>
                  <p className={`mt-1 line-clamp-2 text-sm text-slate-500 ${breakAnywhereClass}`}>{categoryLabel}</p>
                  <p className="mt-3 text-sm font-semibold text-emerald-700">{formatMoney(product.price)}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
                  {badge.label}
                </span>
                <span className="text-xs text-slate-500">Ton: {qty}</span>
                <span className="text-xs text-slate-500">Nguong: {threshold}</span>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => openProductPreview(product)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  <Eye size={15} />
                  Xem chi tiet
                </button>
                <button
                  type="button"
                  onClick={() => openEditProductModal(product)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
                >
                  <Edit3 size={15} />
                  Chinh sua
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {paginatedProducts.total > 0 && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-slate-50 text-left text-sm text-slate-500">
                  <tr>
                    <th className="px-5 py-4">San pham</th>
                    <th className="px-5 py-4">Danh muc</th>
                    <th className="px-5 py-4">Gia</th>
                    <th className="px-5 py-4">Ton kho</th>
                    <th className="px-5 py-4">Trang thai</th>
                    <th className="px-5 py-4 text-right">Thao tac</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {paginatedProducts.items.map((product) => {
                    const mappedCategory = categoryDirectory.find((item) => item.id === mapProductToCategoryId(product, categoryDirectory));
                    const qty = Number(product.stock ?? product.quantity ?? 0);
                    const threshold = Number(product.low_stock_threshold ?? 5);
                    const badge = getStockBadge(qty, threshold);

                    return (
                      <tr key={product.id}>
                        <td className="px-5 py-4 align-top">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="h-14 w-14 overflow-hidden rounded-2xl bg-slate-100">
                              {product.image_url ? (
                                <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-slate-400">
                                  <ImagePlus size={18} />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`line-clamp-2 font-semibold leading-6 text-slate-950 ${breakAnywhereClass}`}>{product.name}</p>
                              <p className={`mt-1 line-clamp-2 text-xs leading-5 text-slate-500 ${breakAnywhereClass}`}>
                                {product.description || 'Chua co mo ta'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top text-slate-600">
                          {mappedCategory?.label || product.category || 'Khac'}
                        </td>
                        <td className="px-5 py-4 align-top font-semibold text-emerald-700">{formatMoney(product.price)}</td>
                        <td className="px-5 py-4 align-top text-slate-900">
                          <div className="space-y-1">
                            <p className="font-semibold">{qty}</p>
                            <p className="text-xs text-slate-500">Nguong {threshold}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openProductPreview(product)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-slate-700"
                            >
                              <Eye size={14} />
                              Xem
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditProductModal(product)}
                              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-white"
                            >
                              <Edit3 size={14} />
                              Sua
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <PaginationControls
            page={paginatedProducts.page}
            totalPages={paginatedProducts.totalPages}
            total={paginatedProducts.total}
            onPageChange={setProductPage}
          />
        </div>
      )}
    </section>
  );

  const renderWarehouse = () => (
    <section className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <div className="overflow-hidden rounded-[30px] border border-[color:var(--line-soft)] bg-white shadow-[var(--shadow-soft)]">
          <div className="bg-[linear-gradient(135deg,rgba(15,154,98,0.10),rgba(216,169,52,0.08),rgba(255,255,255,0.96))] p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Danh muc moi</p>
              <h2 className="mt-2 text-xl font-black text-slate-950">Them san pham trong kho</h2>
              <p className="mt-1 text-sm text-slate-500">
                Kho hang chi giu thao tac tao va xoa san pham. Viec chinh sua da chuyen ve tab San pham.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateProductModal}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-emerald-200"
            >
              <PackagePlus size={18} />
              Them san pham
            </button>
          </div>
          </div>
        </div>

        <div className="rounded-[30px] border border-[color:var(--line-soft)] bg-white p-5 shadow-[var(--shadow-soft)] md:p-6">
          <h2 className="text-xl font-black text-slate-950">Ghi phieu xuat nhap kho</h2>
          <p className="mt-1 text-sm text-slate-500">Validate ton kho ngay tren client truoc khi gui API de tranh giao dich khong hop le.</p>
          <form onSubmit={handleWarehouseSubmit} className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">San pham</span>
              <select
                required
                value={warehouseForm.productId}
                onChange={(event) => setWarehouseForm((prev) => ({ ...prev, productId: event.target.value }))}
                className={textInputClass}
              >
                <option value="">Chon san pham...</option>
                {warehouseProductOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} (ton: {item.quantity ?? item.stock ?? 0})
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Loai giao dich</span>
              <select
                value={warehouseForm.type}
                onChange={(event) => setWarehouseForm((prev) => ({ ...prev, type: event.target.value }))}
                className={textInputClass}
              >
                <option value="import">Nhap kho</option>
                <option value="export">Xuat kho</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">So luong</span>
              <input
                required
                min="1"
                type="number"
                value={warehouseForm.quantity}
                onChange={(event) => setWarehouseForm((prev) => ({ ...prev, quantity: event.target.value }))}
                className={textInputClass}
                placeholder="0"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ngay giao dich</span>
              <input
                type="date"
                value={warehouseForm.date}
                max={todayISO()}
                onChange={(event) => setWarehouseForm((prev) => ({ ...prev, date: event.target.value }))}
                className={textInputClass}
              />
            </label>

            <label className="space-y-2 xl:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ghi chu</span>
              <input
                type="text"
                value={warehouseForm.note}
                onChange={(event) => setWarehouseForm((prev) => ({ ...prev, note: event.target.value }))}
                className={textInputClass}
                placeholder="Ly do hoac ghi chu..."
              />
            </label>

            <div className="flex justify-end xl:col-span-3">
              <button
                type="submit"
                disabled={loading}
                className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white ${
                  warehouseForm.type === 'export' ? 'bg-rose-600' : 'bg-emerald-600'
                }`}
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : warehouseForm.type === 'export' ? (
                  <ArrowUpFromLine size={16} />
                ) : (
                  <ArrowDownToLine size={16} />
                )}
                {warehouseForm.type === 'export' ? 'Xuat kho' : 'Nhap kho'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="rounded-[30px] border border-[color:var(--line-soft)] bg-white p-5 shadow-[var(--shadow-soft)] md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Excel kho</p>
            <h3 className="mt-2 text-xl font-black text-slate-950">Nhap va xuat giao dich kho bang file Excel</h3>
            <p className="mt-1 text-sm text-slate-500">
              Xuat danh sach giao dich dang loc hien tai ra `.xlsx`, hoac nhap file moi de ghi nhan nhieu dong xuat nhap kho trong mot lan.
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Cot import bat buoc: `product_id`, `type`, `quantity`. Cot tuy chon: `transaction_date`, `note`.
            </p>
          </div>

          <div className="grid gap-3 xl:min-w-[520px] xl:grid-cols-[1fr_auto_auto]">
            <label className="space-y-2 xl:col-span-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chon file .xlsx</span>
              <input
                key={warehouseExcelInputKey}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleWarehouseExcelFileChange}
                className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
              />
            </label>

            <button
              type="button"
              onClick={handleExportWarehouseExcel}
              disabled={warehouseExcelLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 disabled:opacity-60"
            >
              {warehouseExcelLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowDownToLine size={16} />}
              Xuat Excel
            </button>

            <button
              type="button"
              onClick={handleImportWarehouseExcel}
              disabled={warehouseExcelLoading || !warehouseExcelFile}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {warehouseExcelLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpFromLine size={16} />}
              Nhap Excel
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[0.98fr_1.02fr]">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-950">Ton kho hien tai</h3>
                <p className="mt-1 text-sm text-slate-500">Tim san pham, loc theo trang thai ton kho va xoa san pham neu can. Chinh sua duoc thuc hien ben tab San pham.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[420px]">
                <label className="space-y-2 sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tim san pham</span>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      value={inventorySearch}
                      onChange={(event) => setInventorySearch(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      placeholder="Ten, mo ta, danh muc..."
                    />
                  </div>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trang thai</span>
                  <select
                    value={inventoryStockFilter}
                    onChange={(event) => setInventoryStockFilter(event.target.value)}
                    className={textInputClass}
                  >
                    <option value="all">Tat ca</option>
                    <option value="ok">On dinh</option>
                    <option value="low">Sap het</option>
                    <option value="out">Het hang</option>
                  </select>
                </label>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tong hien thi</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">{paginatedInventory.total}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-5">
            {paginatedInventory.items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                Khong co san pham nao phu hop bo loc.
              </div>
            ) : (
              paginatedInventory.items.map((product) => {
                const qty = Number(product.quantity ?? product.stock ?? 0);
                const threshold = Number(product.low_stock_threshold ?? 5);
                const badge = getStockBadge(qty, threshold);
                const categoryLabel =
                  categoryDirectory.find((item) => item.id === mapProductToCategoryId(product, categoryDirectory))?.label ||
                  'Khac';

                return (
                  <div key={product.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className={`line-clamp-2 font-semibold text-slate-950 ${breakAnywhereClass}`}>{product.name}</p>
                        <p className={`mt-1 line-clamp-2 text-xs text-slate-500 ${breakAnywhereClass}`}>{categoryLabel}</p>
                      </div>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                      Ton kho hien tai: <span className="font-black text-slate-950">{qty}</span>
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openProductPreview(product)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                      >
                        <Eye size={14} />
                        Xem
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProductItem(product.id, product.name)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        <Trash2 size={14} />
                        Xoa
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <PaginationControls
            page={paginatedInventory.page}
            totalPages={paginatedInventory.totalPages}
            total={paginatedInventory.total}
            onPageChange={setInventoryPage}
          />
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-950">Lich su giao dich kho</h3>
                <p className="mt-1 text-sm text-slate-500">Da them tim kiem va phan trang de doc lich su lau dai gon hon.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[420px]">
                <label className="space-y-2 sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tim giao dich</span>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      value={stockHistoryFilters.search}
                      onChange={(event) => setStockHistoryFilters((prev) => ({ ...prev, search: event.target.value, page: 1 }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      placeholder="Ten san pham, ghi chu, nguoi thao tac..."
                    />
                  </div>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Loai</span>
                  <select
                    value={stockHistoryFilters.type}
                    onChange={(event) => setStockHistoryFilters((prev) => ({ ...prev, type: event.target.value, page: 1 }))}
                    className={textInputClass}
                  >
                    <option value="all">Tat ca</option>
                    <option value="import">Nhap kho</option>
                    <option value="export">Xuat kho</option>
                  </select>
                </label>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tong hien thi</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">{stockHistoryData.total}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-5">
            {stockHistoryLoading && stockHistoryData.items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                <Loader2 size={20} className="mx-auto animate-spin text-emerald-600" />
                <p className="mt-3">Dang tai giao dich kho...</p>
              </div>
            ) : stockHistoryData.items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                Chua co giao dich nao phu hop.
              </div>
            ) : (
              stockHistoryData.items.map((tx) => {
                const isImport = tx.type === 'import' || tx.type === 'IMPORT';
                return (
                  <div key={tx.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-950">{tx.product?.name || `#${tx.product_id}`}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {tx.transaction_date ? formatDateTime(tx.transaction_date) : formatDateTime(tx.created_at)}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                          isImport ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {isImport ? <ArrowDownToLine size={12} /> : <ArrowUpFromLine size={12} />}
                        {isImport ? `+${tx.quantity}` : `-${tx.quantity}`}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                      {tx.user?.full_name || tx.user?.username || `#${tx.user_id}`} - {tx.note || 'Khong co ghi chu'}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          <PaginationControls
            page={stockHistoryData.page}
            totalPages={stockHistoryData.total_pages}
            total={stockHistoryData.total}
            onPageChange={(page) => setStockHistoryFilters((prev) => ({ ...prev, page }))}
          />
        </div>
      </div>
    </section>
  );

  const renderSettings = () => (
    <PaymentQRCodePanel
      paymentQr={paymentQr}
      draft={paymentQrDraft}
      loading={paymentQrLoading}
      saving={paymentQrSaving}
      onProviderChange={(providerName) => setPaymentQrDraft((prev) => ({ ...prev, provider_name: providerName }))}
      onFileChange={handlePaymentQrFileChange}
      onRefresh={() => loadPaymentQr()}
      onSave={handleSavePaymentQr}
    />
  );

  const handleGoHome = () => {
    navigate('/');
  };

  const navigateToTab = (nextTab) => {
    navigate(`/admin/dashboard/${nextTab}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user?.is_admin && user?.role !== 'staff') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto text-rose-500" size={44} />
          <h1 className="mt-4 text-2xl font-black text-slate-950">Khong co quyen truy cap</h1>
          <p className="mt-2 text-sm text-slate-500">Trang nay chi danh cho quan tri vien va nhan vien.</p>
        </div>
      </div>
    );
  }

  const previewCategoryLabel = selectedProductPreview
    ? (
      categoryDirectory.find((item) => item.id === mapProductToCategoryId(selectedProductPreview, categoryDirectory))?.label ||
      selectedProductPreview.category ||
      'Khac'
    )
    : '';

  return (
    <>
      <AdminShell
        user={user}
        tabs={visibleTabs}
        activeTab={activeTab}
        onTabChange={navigateToTab}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
        title={activeTabCopy.title}
        subtitle={activeTabCopy.subtitle}
        refreshing={isRefreshing}
        onRefresh={handleRefreshActiveTab}
        onGoHome={handleGoHome}
        onLogout={handleLogout}
      >
        {message && (
          <div
            className={`mb-6 rounded-[28px] border px-5 py-4 text-sm font-semibold shadow-[0_10px_24px_rgba(15,23,42,0.04)] ${
              message.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {activeTab === 'overview' && !isStaff && renderOverview()}
        {activeTab === 'users' && !isStaff && renderUsers()}
        {activeTab === 'orders' && (
          <OrderManagementPanel
            active={activeTab === 'orders'}
            refreshNonce={orderRefreshNonce}
            canDeleteOrders={Boolean(user?.is_admin)}
          />
        )}
        {activeTab === 'products' && renderProducts()}
        {activeTab === 'warehouse' && renderWarehouse()}
        {activeTab === 'feedback' && !isStaff && (
          <AIFeedbackPanel
            items={feedbackData.items}
            total={feedbackData.total}
            unreadCount={feedbackData.unread_count}
            filter={feedbackFilters.status}
            search={feedbackFilters.search}
            page={feedbackData.page}
            totalPages={feedbackData.total_pages}
            loading={feedbackLoading}
            markingId={markingFeedbackId}
            onFilterChange={(status) => setFeedbackFilters((prev) => ({ ...prev, status, page: 1 }))}
            onSearchChange={(search) => setFeedbackFilters((prev) => ({ ...prev, search, page: 1 }))}
            onPageChange={(page) => setFeedbackFilters((prev) => ({ ...prev, page }))}
            onRefresh={() => loadFeedback(feedbackFilters)}
            onMarkRead={handleMarkFeedbackRead}
          />
        )}
        {activeTab === 'settings' && !isStaff && renderSettings()}
      </AdminShell>

      <ProductPreviewModal
        product={selectedProductPreview}
        categoryLabel={previewCategoryLabel}
        onClose={closeProductPreview}
      />

      {isProductModalOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-[32px] border border-white/70 bg-[rgba(255,255,255,0.98)] p-6 shadow-[var(--shadow-overlay)] md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                  {editingProductId ? 'Product editor' : 'Warehouse product creator'}
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">
                  {editingProductId ? 'Cap nhat san pham' : 'Tao san pham moi'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {editingProductId
                    ? 'Chinh sua thong tin ban hang tai day. Ton kho duoc quan ly rieng o tab Kho hang hoac qua file Excel.'
                    : 'Form nay duoc mo tu tab Kho hang de tao san pham moi kem ton kho ban dau.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeProductModal}
                className="rounded-2xl border border-[color:var(--line-strong)] px-4 py-2 text-sm font-bold text-slate-700"
              >
                Dong
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Ten san pham</span>
                  <input
                    required
                    value={productForm.name}
                    onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
                    className={textInputClass}
                    placeholder="Nhap ten san pham"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Danh muc</span>
                  <select
                    required
                    value={productForm.categoryId}
                    onChange={(event) => setProductForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                    className={textInputClass}
                  >
                    <option value="">Chon danh muc</option>
                    {categoryDirectory.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label || category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Gia (VND)</span>
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    value={formatPriceInput(productForm.price)}
                    onChange={(event) => setProductForm((prev) => ({ ...prev, price: sanitizeDigits(event.target.value) }))}
                    className={textInputClass}
                    placeholder="35000 VND"
                  />
                </label>

                {editingProductId ? (
                  <div className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">Ton kho hien tai</span>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <span className="font-black text-slate-950">{formatCompactNumber(productForm.stock || 0)}</span>
                      <span className="ml-2 text-slate-500">Chi cap nhat ton kho tai tab Kho hang hoac bang file Excel.</span>
                    </div>
                  </div>
                ) : (
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">Ton kho</span>
                    <input
                      required
                      type="number"
                      min="0"
                      value={productForm.stock}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, stock: event.target.value }))}
                      className={textInputClass}
                      placeholder="So luong ton"
                    />
                  </label>
                )}

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Nguong canh bao</span>
                  <input
                    type="number"
                    min="0"
                    value={productForm.lowStockThreshold}
                    onChange={(event) => setProductForm((prev) => ({ ...prev, lowStockThreshold: event.target.value }))}
                    className={textInputClass}
                    placeholder="5"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Don vi tinh</span>
                  <input
                    value={productForm.unit}
                    onChange={(event) => setProductForm((prev) => ({ ...prev, unit: event.target.value }))}
                    className={textInputClass}
                    placeholder="kg, hop, tui..."
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Tai anh san pham</span>
                  <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      id="product-image-input"
                      className="hidden"
                      onChange={handleAdminImageUpload}
                    />
                    <p className="text-sm font-semibold text-slate-700">Chon anh tu may tinh hoac cap nhat bang URL / data URL.</p>
                    <label
                      htmlFor="product-image-input"
                      className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)]"
                    >
                      <ImagePlus size={16} />
                      Chon anh
                    </label>
                  </div>
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Mo ta</span>
                <textarea
                  rows={4}
                  value={productForm.description}
                  onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))}
                  className={textInputClass}
                  placeholder="Nhap mo ta san pham"
                />
              </label>

              {imagePreview && (
                <div className="rounded-[28px] border border-[color:var(--line-soft)] bg-slate-50 p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-700">Xem truoc hinh anh</p>
                  <img src={imagePreview} alt="Preview" className="h-64 w-full rounded-2xl object-cover" />
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={closeProductModal}
                  className="rounded-2xl border border-[color:var(--line-strong)] px-5 py-3 text-sm font-bold text-slate-700"
                >
                  Huy
                </button>
                <button
                  type="submit"
                  disabled={loading || isImageProcessing}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(5,150,105,0.22)] disabled:opacity-70"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <PackagePlus size={16} />}
                  {isImageProcessing
                    ? 'Dang xu ly anh...'
                    : editingProductId
                      ? 'Luu thay doi'
                      : 'Them san pham'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminDashboard;
