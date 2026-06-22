import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  addProduct,
  addStockTransaction,
  deleteProduct,
  deleteUser,
  exportAdminFreshnessVerificationReportsExcel,
  exportStockTransactionsExcel,
  getAdminFreshnessVerificationReports,
  getAdminFeedbackEvents,
  getAdminPaymentQRCode,
  getAdminStats,
  getAdminUsersPage,
  getCategories,
  getProducts,
  getStockTransactionsPage,
  importStockTransactionsExcel,
  isRequestCanceled,
  markAdminFeedbackRead,
  updateAdminPaymentQRCode,
  updateProduct,
  updateUserRole,
} from '../services/api';
import OrderManagementPanel from '../components/admin/OrderManagementPanel';
import AdminShell from '../components/admin/AdminShell';
import AIFeedbackPanel from '../components/admin/AIFeedbackPanel';
import FreshnessVerificationReportsPanel from '../components/admin/FreshnessVerificationReportsPanel';
import OverviewPanel from '../components/admin/panels/OverviewPanel';
import UsersPanel from '../components/admin/panels/UsersPanel';
import ProductsPanel from '../components/admin/panels/ProductsPanel';
import WarehousePanel from '../components/admin/panels/WarehousePanel';
import SettingsPanel from '../components/admin/panels/SettingsPanel';
import ProductFormModal from '../components/admin/ProductFormModal';
import ProductPreviewModal from '../components/admin/shared/ProductPreviewModal';
import { buildCategoryDirectory, mapProductToCategoryId } from '../data/categorySystem';
import { safeText } from '../utils/text';
import {
  TAB_DEFINITIONS,
  STAFF_TABS,
  FEATURED_PRODUCT_LIMIT,
  PAGE_SIZE,
  PAGE_COPY,
  emptyProductForm,
  getProductBadgeOptionByValue,
  getProductBadgeOptionValue,
} from '../constants/adminDashboard';
import { formatCompactNumber, downloadBlobFile } from '../utils/admin/formatters';
import {
  todayISO,
  normalizeText,
  getStockState,
  paginateItems,
  getWarehouseProductOptionLabel,
  buildProductPayload,
} from '../utils/admin/stockHelpers';

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
  const [freshnessReportsLoading, setFreshnessReportsLoading] = useState(false);
  const [freshnessReportsExporting, setFreshnessReportsExporting] = useState(false);
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
    read_count: 0,
    disputed_count: 0,
    global_total: 0,
    global_unread_count: 0,
    global_read_count: 0,
    global_disputed_count: 0,
    page: 1,
    limit: 10,
    total_pages: 1,
    has_next: false,
  });
  const [freshnessReportsData, setFreshnessReportsData] = useState({
    items: [],
    total: 0,
    page: 1,
    limit: 12,
    total_pages: 1,
    has_next: false,
  });
  const [paymentQr, setPaymentQr] = useState(null);
  const [paymentQrDraft, setPaymentQrDraft] = useState({
    provider_name: 'Chuyển khoản',
    file: null,
    preview: '',
  });
  const [orderRefreshNonce, setOrderRefreshNonce] = useState(0);

  const [userFilters, setUserFilters] = useState({ search: '', role: 'all', page: 1, limit: 10 });
  const [feedbackFilters, setFeedbackFilters] = useState({ status: 'all', verdict: 'all', search: '', page: 1, limit: 12 });
  const [freshnessReportFilters, setFreshnessReportFilters] = useState({
    date_from: '',
    date_to: '',
    prediction_correct: 'all',
    correct_result: 'all',
    has_voucher: 'all',
    page: 1,
    limit: 12,
  });
  const [stockHistoryFilters, setStockHistoryFilters] = useState({ search: '', type: 'all', page: 1, limit: 8 });

  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productStockFilter, setProductStockFilter] = useState('all');
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(20);
  const [productViewMode, setProductViewMode] = useState('list');

  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('all');
  const [inventoryStockFilter, setInventoryStockFilter] = useState('all');
  const [inventoryPage, setInventoryPage] = useState(1);
  const [warehouseSection, setWarehouseSection] = useState('inventory');
  const [warehouseProductQuery, setWarehouseProductQuery] = useState('');
  const [warehouseExportScope, setWarehouseExportScope] = useState('filtered');
  const [warehouseExcelDragActive, setWarehouseExcelDragActive] = useState(false);
  const [paymentQrDragActive, setPaymentQrDragActive] = useState(false);
  const [settingsSection, setSettingsSection] = useState('qr');

  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUserRole, setEditingUserRole] = useState('customer');

  const [selectedProductPreview, setSelectedProductPreview] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productInlineLoadingId, setProductInlineLoadingId] = useState(null);
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

  const unreadFeedbackCount = stats?.unread_feedback_count ?? feedbackData.global_unread_count ?? 0;
  const visibleTabs = useMemo(() => {
    const baseTabs = isStaff ? TAB_DEFINITIONS.filter((tab) => STAFF_TABS.has(tab.key)) : TAB_DEFINITIONS;
    return baseTabs.map((tab) => (tab.key === 'feedback' ? { ...tab, badge: unreadFeedbackCount } : tab));
  }, [isStaff, unreadFeedbackCount]);

  const hasResolvedSection = useMemo(
    () => Boolean(section && visibleTabs.some((tab) => tab.key === section)),
    [section, visibleTabs],
  );
  const shouldRedirectToDefaultTab = !hasResolvedSection;
  const activeTab = useMemo(() => {
    if (!hasResolvedSection) return defaultTab;
    return section;
  }, [defaultTab, hasResolvedSection, section]);

  const activeTabCopy = PAGE_COPY[activeTab] || PAGE_COPY.orders;
  const isRefreshing =
    loading ||
    overviewLoading ||
    catalogLoading ||
    usersLoading ||
    stockHistoryLoading ||
    warehouseExcelLoading ||
    feedbackLoading ||
    freshnessReportsLoading ||
    freshnessReportsExporting ||
    paymentQrLoading ||
    paymentQrSaving;

  const filteredProducts = useMemo(() => {
    const searchToken = normalizeText(productSearch);
    return products.filter((product) => {
      const categoryId = mapProductToCategoryId(product, categoryDirectory);
      const qty = Number(product.quantity ?? product.stock ?? 0);
      const threshold = Number(product.low_stock_threshold ?? 5);
      const stockState = getStockState(qty, threshold);
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
    () => paginateItems(filteredProducts, productPage, productPageSize),
    [filteredProducts, productPage, productPageSize],
  );

  const featuredCount = useMemo(
    () => products.filter((product) => Boolean(product.is_featured)).length,
    [products],
  );

  const filteredInventoryProducts = useMemo(() => {
    const searchToken = normalizeText(inventorySearch);
    return products.filter((product) => {
      const qty = Number(product.quantity ?? product.stock ?? 0);
      const threshold = Number(product.low_stock_threshold ?? 5);
      const stockState = getStockState(qty, threshold);
      const categoryId = mapProductToCategoryId(product, categoryDirectory);
      const haystack = normalizeText(
        [product.name, product.description, product.category, product.category_name]
          .filter(Boolean)
          .join(' ')
      );
      const matchesSearch = !searchToken || haystack.includes(searchToken);
      const matchesStock = inventoryStockFilter === 'all' || stockState === inventoryStockFilter;
      const matchesCategory = inventoryCategoryFilter === 'all' || String(categoryId) === String(inventoryCategoryFilter);
      return matchesSearch && matchesStock && matchesCategory;
    });
  }, [inventoryCategoryFilter, inventorySearch, inventoryStockFilter, products, categoryDirectory]);

  const paginatedInventory = useMemo(
    () => paginateItems(filteredInventoryProducts, inventoryPage, PAGE_SIZE),
    [filteredInventoryProducts, inventoryPage],
  );

  const warehouseProductOptions = useMemo(
    () => [...products].sort((a, b) => safeText(a.name).localeCompare(safeText(b.name), 'vi')),
    [products],
  );
  const selectedWarehouseProduct = useMemo(
    () => products.find((item) => String(item.id) === String(warehouseForm.productId)) || null,
    [products, warehouseForm.productId],
  );
  const recentStockTransactions = useMemo(
    () => (Array.isArray(stockHistoryData.items) ? stockHistoryData.items.slice(0, 6) : []),
    [stockHistoryData.items],
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('nutrigro-admin-sidebar', sidebarCollapsed ? 'collapsed' : 'expanded');
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (shouldRedirectToDefaultTab) {
      navigate(`/admin/dashboard/${defaultTab}`, { replace: true });
    }
  }, [defaultTab, navigate, shouldRedirectToDefaultTab]);

  useEffect(() => {
    setProductPage(1);
  }, [productCategoryFilter, productPageSize, productSearch, productStockFilter]);

  useEffect(() => {
    setInventoryPage(1);
  }, [inventoryCategoryFilter, inventorySearch, inventoryStockFilter]);

  useEffect(() => {
    if (!selectedWarehouseProduct) return;
    const nextLabel = getWarehouseProductOptionLabel(selectedWarehouseProduct);
    if (warehouseProductQuery !== nextLabel) {
      setWarehouseProductQuery(nextLabel);
    }
  }, [selectedWarehouseProduct, warehouseForm.productId, warehouseProductQuery]);

  const showError = (error, fallback) => {
    if (isRequestCanceled(error)) return;
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
      showError(error, 'Không thể tải thống kê dashboard.');
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
      showError(error, 'Không thể tải danh mục sản phẩm.');
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
      showError(error, 'Không thể tải danh sách người dùng.');
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
      showError(error, 'Không thể tải lịch sử giao dịch kho.');
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
      showError(error, 'Không thể tải AI feedback.');
      return null;
    } finally {
      if (!silent) setFeedbackLoading(false);
    }
  };

  const loadFreshnessReports = async (nextFilters = freshnessReportFilters, { silent = false } = {}) => {
    if (isStaff) return null;
    if (!silent) {
      setFreshnessReportsLoading(true);
      setMessage(null);
    }

    try {
      const payload = await getAdminFreshnessVerificationReports(nextFilters);
      setFreshnessReportsData(payload);
      return payload;
    } catch (error) {
      showError(error, 'Không thể tải báo cáo xác minh độ tươi.');
      return null;
    } finally {
      if (!silent) setFreshnessReportsLoading(false);
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
        provider_name: payload?.provider_name || 'Chuyển khoản',
        file: null,
        preview: payload?.image_url || '',
      });
      return payload;
    } catch (error) {
      showError(error, 'Không thể tải mã QR thanh toán.');
      return null;
    } finally {
      if (!silent) setPaymentQrLoading(false);
    }
  };

  useEffect(() => {
    if (!user || shouldRedirectToDefaultTab) return;
    if (activeTab === 'overview' && !isStaff) loadOverview();
    if ((activeTab === 'products' || activeTab === 'warehouse') && products.length === 0) loadCatalog();
    if (activeTab === 'settings' && !isStaff) loadPaymentQr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, shouldRedirectToDefaultTab, user?.id]);

  useEffect(() => {
    if (!user || shouldRedirectToDefaultTab || isStaff || activeTab !== 'users') return;
    loadUsers(userFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, shouldRedirectToDefaultTab, user?.id, userFilters.page, userFilters.limit, userFilters.role, userFilters.search, isStaff]);

  useEffect(() => {
    if (!user || shouldRedirectToDefaultTab || activeTab !== 'warehouse') return;
    loadStockHistory(stockHistoryFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    shouldRedirectToDefaultTab,
    user?.id,
    stockHistoryFilters.page,
    stockHistoryFilters.limit,
    stockHistoryFilters.search,
    stockHistoryFilters.type,
  ]);

  useEffect(() => {
    if (!user || shouldRedirectToDefaultTab || isStaff || activeTab !== 'feedback') return;
    loadFeedback(feedbackFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    shouldRedirectToDefaultTab,
    user?.id,
    feedbackFilters.page,
    feedbackFilters.limit,
    feedbackFilters.search,
    feedbackFilters.status,
    feedbackFilters.verdict,
    isStaff,
  ]);

  useEffect(() => {
    if (!user || shouldRedirectToDefaultTab || isStaff || activeTab !== 'freshnessReports') return;
    loadFreshnessReports(freshnessReportFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    shouldRedirectToDefaultTab,
    user?.id,
    freshnessReportFilters.page,
    freshnessReportFilters.limit,
    freshnessReportFilters.date_from,
    freshnessReportFilters.date_to,
    freshnessReportFilters.prediction_correct,
    freshnessReportFilters.correct_result,
    freshnessReportFilters.has_voucher,
    isStaff,
  ]);

  const handleRefreshActiveTab = async () => {
    if (shouldRedirectToDefaultTab) return;
    if (activeTab === 'overview') await loadOverview();
    if (activeTab === 'users') await loadUsers(userFilters);
    if (activeTab === 'products') await loadCatalog();
    if (activeTab === 'warehouse') {
      await Promise.all([loadCatalog(), loadStockHistory(stockHistoryFilters)]);
    }
    if (activeTab === 'freshnessReports') await loadFreshnessReports(freshnessReportFilters);
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

  const openWarehouseCreateSection = () => {
    resetProductForm();
    setWarehouseSection('create');
    navigateToTab('warehouse');
  };

  const openEditProductModal = (product) => {
    const mappedCategoryId = mapProductToCategoryId(product, categoryDirectory);
    setEditingProductId(product.id);
    setProductForm({
      name: product.name || '',
      description: product.description || '',
      price: String(Number(product.base_price || product.original_price || product.price || 0)),
      categoryId: mappedCategoryId || '',
      unit: product.unit || 'kg',
      stock: String(product.stock ?? product.quantity ?? 0),
      lowStockThreshold: String(product.low_stock_threshold ?? 5),
      promotionType: product.promotion_type || 'none',
      promotionValue:
        product.promotion_type === 'percent' || product.promotion_type === 'fixed'
          ? String(Number(product.promotion_value || 0))
          : '',
      promotionLabel: product.promotion_label || '',
      isFeatured: Boolean(product.is_featured),
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

  const handleProductBadgeChange = async (product, nextBadgeValue) => {
    if (!product || nextBadgeValue === 'custom') return;
    if (nextBadgeValue === getProductBadgeOptionValue(product)) return;

    const nextBadge = getProductBadgeOptionByValue(nextBadgeValue);
    setProductInlineLoadingId(product.id);
    setMessage(null);

    try {
      await updateProduct(product.id, {
        promotion_type: nextBadge.promotionType,
        promotion_value: Number(nextBadge.promotionValue || 0),
        promotion_label: nextBadge.promotionLabel || null,
      });
      await loadCatalog({ silent: true });
      setMessage({
        type: 'success',
        text: `�� c?p nh?t badge cho s?n ph?m "${product.name}".`,
      });
    } catch (error) {
      showError(error, 'Không thể cập nhật badge sản phẩm.');
    } finally {
      setProductInlineLoadingId(null);
    }
  };

  const handleProductFeaturedToggle = async (product) => {
    if (!product) return;
    if (!product.is_featured && featuredCount >= FEATURED_PRODUCT_LIMIT) {
      setMessage({
        type: 'error',
        text: `Chỉ được chọn tối đa ${FEATURED_PRODUCT_LIMIT} sản phẩm nổi bật.`,
      });
      return;
    }

    setProductInlineLoadingId(product.id);
    setMessage(null);

    try {
      await updateProduct(product.id, {
        is_featured: !product.is_featured,
      });
      await loadCatalog({ silent: true });
      setMessage({
        type: 'success',
        text: product.is_featured
          ? `�� t?t tr?ng th�i n?i b?t cho s?n ph?m "${product.name}".`
          : `�� th�m s?n ph?m "${product.name}" v�o nh�m n?i b?t.`,
      });
    } catch (error) {
      showError(error, 'Không thể cập nhật trạng thái nổi bật.');
    } finally {
      setProductInlineLoadingId(null);
    }
  };

  const jumpToWarehouseTransaction = (product, type = 'import') => {
    if (!product) return;
    setWarehouseSection('transactions');
    setWarehouseForm({
      productId: String(product.id),
      type,
      quantity: '',
      note: '',
      date: todayISO(),
    });
    setWarehouseProductQuery(getWarehouseProductOptionLabel(product));
    navigateToTab('warehouse');
  };

  const handleWarehouseProductQueryChange = (value) => {
    setWarehouseProductQuery(value);
    const matchedProduct = warehouseProductOptions.find((item) => getWarehouseProductOptionLabel(item) === value);
    setWarehouseForm((prev) => ({
      ...prev,
      productId: matchedProduct ? String(matchedProduct.id) : '',
    }));
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
      setMessage({ type: 'error', text: 'Không thể đọc tệp ảnh. Vui lòng thử lại.' });
    };
    reader.readAsDataURL(localFile);
  };

  const handleSaveProduct = async (event) => {
    event.preventDefault();
    if (isImageProcessing) {
      setMessage({ type: 'error', text: 'Ảnh đang được xử lý. Vui lòng đợi.' });
      return;
    }
    if (!productForm.name.trim()) {
      setMessage({ type: 'error', text: 'Tên sản phẩm không được để trống.' });
      return;
    }
    if (!productForm.categoryId) {
      setMessage({ type: 'error', text: 'Vui lòng chọn danh mục.' });
      return;
    }
    if (!productForm.price || Number(productForm.price) <= 0) {
      setMessage({ type: 'error', text: 'Giá sản phẩm phải lớn hơn 0.' });
      return;
    }

    const trimmedName = productForm.name.trim().toLowerCase();
    const duplicate = products.find(
      (item) => item.name.trim().toLowerCase() === trimmedName && item.id !== editingProductId,
    );
    if (duplicate) {
      setMessage({ type: 'error', text: `T�n s?n ph?m "${productForm.name.trim()}" d� t?n t?i.` });
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
        text: editingProductId ? 'Cập nhật sản phẩm thành công.' : 'Thêm sản phẩm thành công.',
      });
      closeProductModal();
    } catch (error) {
      showError(error, 'Không thể lưu sản phẩm.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProductItem = async (productId, productName) => {
    if (!window.confirm(`Xóa sản phẩm ${productName}?`)) return;

    setLoading(true);
    setMessage(null);
    try {
      await deleteProduct(productId);
      await Promise.all([
        loadCatalog({ silent: true }),
        activeTab === 'warehouse' ? loadStockHistory(stockHistoryFilters, { silent: true }) : Promise.resolve(),
        !isStaff ? loadOverview({ silent: true }) : Promise.resolve(),
      ]);
      setMessage({ type: 'success', text: '�� x�a s?n ph?m.' });
    } catch (error) {
      showError(error, 'Không thể xóa sản phẩm.');
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
      setMessage({ type: 'success', text: 'Đã cập nhật vai trò người dùng.' });
    } catch (error) {
      showError(error, 'Không thể cập nhật vai trò.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (!window.confirm(`Xóa người dùng ${targetUser.username}?`)) return;

    setLoading(true);
    setMessage(null);
    try {
      await deleteUser(targetUser.id);
      await Promise.all([loadUsers(userFilters, { silent: true }), loadOverview({ silent: true })]);
      setMessage({ type: 'success', text: 'Đã xóa người dùng.' });
    } catch (error) {
      showError(error, 'Không thể xóa người dùng.');
    } finally {
      setLoading(false);
    }
  };

  const handleWarehouseSubmit = async (event) => {
    event.preventDefault();

    const qty = Number(warehouseForm.quantity);
    if (!warehouseForm.productId) {
      setMessage({ type: 'error', text: 'Vui lòng chọn sản phẩm.' });
      return;
    }
    if (!qty || qty < 1) {
      setMessage({ type: 'error', text: 'Số lượng phải lớn hơn 0.' });
      return;
    }
    if (
      warehouseForm.type === 'export' &&
      selectedWarehouseProduct &&
      qty > Number(selectedWarehouseProduct.quantity ?? selectedWarehouseProduct.stock ?? 0)
    ) {
      setMessage({
        type: 'error',
        text: `Không thể xuất ${qty} sản phẩm khi tồn kho hiện tại chỉ còn ${Number(selectedWarehouseProduct.quantity ?? selectedWarehouseProduct.stock ?? 0)}.`,
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
      setWarehouseProductQuery('');
      setMessage({
        type: 'success',
        text: `${warehouseForm.type === 'export' ? 'Xuất' : 'Nhập'} kho thành công.`,
      });
    } catch (error) {
      showError(error, 'Không thể ghi giao dịch kho.');
    } finally {
      setLoading(false);
    }
  };

  const handleWarehouseExcelFileChange = (event) => {
    const nextFile = event?.target?.files?.[0] || null;
    setWarehouseExcelFile(nextFile);
    setWarehouseExcelDragActive(false);
  };

  const handleWarehouseExcelDrop = (event) => {
    event.preventDefault();
    const nextFile = event?.dataTransfer?.files?.[0] || null;
    setWarehouseExcelFile(nextFile);
    setWarehouseExcelDragActive(false);
  };

  const handleExportWarehouseExcel = async () => {
    setWarehouseExcelLoading(true);
    setMessage(null);
    try {
      const exportFilters =
        warehouseExportScope === 'filtered'
          ? {
              ...(stockHistoryFilters.search ? { search: stockHistoryFilters.search } : {}),
              ...(stockHistoryFilters.type && stockHistoryFilters.type !== 'all' ? { type: stockHistoryFilters.type } : {}),
            }
          : warehouseExportScope === 'all'
            ? {}
            : { type: warehouseExportScope };
      const { blob, filename } = await exportStockTransactionsExcel({
        ...exportFilters,
      });
      downloadBlobFile(blob, filename);
      setMessage({ type: 'success', text: 'Đã xuất file Excel giao dịch kho.' });
    } catch (error) {
      showError(error, 'Không thể xuất file Excel giao dịch kho.');
    } finally {
      setWarehouseExcelLoading(false);
    }
  };

  const handleImportWarehouseExcel = async () => {
    if (!warehouseExcelFile) {
      setMessage({ type: 'error', text: 'Vui lòng chọn file Excel .xlsx để nhập kho.' });
      return;
    }
    if (!/\.xlsx$/i.test(warehouseExcelFile.name || '')) {
      setMessage({ type: 'error', text: 'Chỉ hỗ trợ file Excel định dạng .xlsx.' });
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
        text: `Đã nhập ${formatCompactNumber(result.imported_count || 0)} giao dịch từ file Excel.`,
      });
    } catch (error) {
      showError(error, 'Không thể nhập file Excel giao dịch kho.');
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
      setMessage({ type: 'success', text: 'Đã đánh dấu feedback là đã đọc.' });
    } catch (error) {
      showError(error, 'Không thể cập nhật trạng thái feedback.');
    } finally {
      setMarkingFeedbackId(null);
    }
  };

  const handleExportFreshnessReports = async () => {
    setFreshnessReportsExporting(true);
    setMessage(null);
    try {
      const { blob, filename } = await exportAdminFreshnessVerificationReportsExcel({
        date_from: freshnessReportFilters.date_from || undefined,
        date_to: freshnessReportFilters.date_to || undefined,
        prediction_correct: freshnessReportFilters.prediction_correct,
        correct_result: freshnessReportFilters.correct_result,
        has_voucher: freshnessReportFilters.has_voucher,
      });
      downloadBlobFile(blob, filename);
      setMessage({ type: 'success', text: 'Đã xuất Excel báo cáo xác minh độ tươi.' });
    } catch (error) {
      showError(error, 'Không thể xuất Excel báo cáo xác minh độ tươi.');
    } finally {
      setFreshnessReportsExporting(false);
    }
  };

  const handlePaymentQrFileChange = (event) => {
    const localFile = event?.target?.files?.[0];
    if (!localFile || !localFile.type?.startsWith('image/')) return;
    setPaymentQrDragActive(false);

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
      setMessage({ type: 'error', text: 'Vui lòng nhập tên kênh thanh toán.' });
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
      setMessage({ type: 'success', text: 'Đã cập nhật mã QR thanh toán.' });
    } catch (error) {
      showError(error, 'Không thể cập nhật mã QR thanh toán.');
    } finally {
      setPaymentQrSaving(false);
    }
  };

  const navigateToTab = (nextTab) => {
    navigate(`/admin/dashboard/${nextTab}`);
  };

  const handleGoHome = () => {
    navigate('/');
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
          <h1 className="mt-4 text-2xl font-black text-slate-950">Không có quyền truy cập</h1>
          <p className="mt-2 text-sm text-slate-500">Trang này chỉ dành cho quản trị viên và nhân viên.</p>
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
        notificationCount={0}
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

        {!shouldRedirectToDefaultTab && activeTab === 'overview' && !isStaff && (
          <OverviewPanel
            stats={stats}
            overviewLoading={overviewLoading}
            navigateToTab={navigateToTab}
          />
        )}

        {!shouldRedirectToDefaultTab && activeTab === 'users' && !isStaff && (
          <UsersPanel
            userFilters={userFilters}
            setUserFilters={setUserFilters}
            usersData={usersData}
            usersLoading={usersLoading}
            editingUserId={editingUserId}
            setEditingUserId={setEditingUserId}
            editingUserRole={editingUserRole}
            setEditingUserRole={setEditingUserRole}
            handleSaveUserRole={handleSaveUserRole}
            handleDeleteUser={handleDeleteUser}
            startEditUserRole={startEditUserRole}
            setMessage={setMessage}
          />
        )}

        {!shouldRedirectToDefaultTab && activeTab === 'orders' && (
          <OrderManagementPanel
            active={activeTab === 'orders'}
            refreshNonce={orderRefreshNonce}
            canDeleteOrders={Boolean(user?.is_admin)}
          />
        )}

        {!shouldRedirectToDefaultTab && activeTab === 'products' && (
          <ProductsPanel
            productSearch={productSearch}
            setProductSearch={setProductSearch}
            productCategoryFilter={productCategoryFilter}
            setProductCategoryFilter={setProductCategoryFilter}
            productStockFilter={productStockFilter}
            setProductStockFilter={setProductStockFilter}
            productViewMode={productViewMode}
            setProductViewMode={setProductViewMode}
            categoryDirectory={categoryDirectory}
            paginatedProducts={paginatedProducts}
            productPageSize={productPageSize}
            setProductPage={setProductPage}
            setProductPageSize={setProductPageSize}
            catalogLoading={catalogLoading}
            loading={loading}
            featuredCount={featuredCount}
            productInlineLoadingId={productInlineLoadingId}
            openWarehouseCreateSection={openWarehouseCreateSection}
            openProductPreview={openProductPreview}
            openEditProductModal={openEditProductModal}
            handleProductBadgeChange={handleProductBadgeChange}
            handleProductFeaturedToggle={handleProductFeaturedToggle}
            handleDeleteProductItem={handleDeleteProductItem}
          />
        )}

        {!shouldRedirectToDefaultTab && activeTab === 'warehouse' && (
          <WarehousePanel
            warehouseSection={warehouseSection}
            setWarehouseSection={setWarehouseSection}
            categoryDirectory={categoryDirectory}
            inventorySearch={inventorySearch}
            setInventorySearch={setInventorySearch}
            inventoryCategoryFilter={inventoryCategoryFilter}
            setInventoryCategoryFilter={setInventoryCategoryFilter}
            inventoryStockFilter={inventoryStockFilter}
            setInventoryStockFilter={setInventoryStockFilter}
            paginatedInventory={paginatedInventory}
            setInventoryPage={setInventoryPage}
            warehouseProductQuery={warehouseProductQuery}
            warehouseForm={warehouseForm}
            setWarehouseForm={setWarehouseForm}
            warehouseProductOptions={warehouseProductOptions}
            selectedWarehouseProduct={selectedWarehouseProduct}
            loading={loading}
            recentStockTransactions={recentStockTransactions}
            stockHistoryLoading={stockHistoryLoading}
            handleWarehouseSubmit={handleWarehouseSubmit}
            handleWarehouseProductQueryChange={handleWarehouseProductQueryChange}
            jumpToWarehouseTransaction={jumpToWarehouseTransaction}
            handleDeleteProductItem={handleDeleteProductItem}
            warehouseExcelDragActive={warehouseExcelDragActive}
            setWarehouseExcelDragActive={setWarehouseExcelDragActive}
            warehouseExcelFile={warehouseExcelFile}
            warehouseExcelLoading={warehouseExcelLoading}
            warehouseExcelInputKey={warehouseExcelInputKey}
            warehouseExportScope={warehouseExportScope}
            setWarehouseExportScope={setWarehouseExportScope}
            handleWarehouseExcelDrop={handleWarehouseExcelDrop}
            handleWarehouseExcelFileChange={handleWarehouseExcelFileChange}
            handleImportWarehouseExcel={handleImportWarehouseExcel}
            handleExportWarehouseExcel={handleExportWarehouseExcel}
            productForm={productForm}
            setProductForm={setProductForm}
            imagePreview={imagePreview}
            isImageProcessing={isImageProcessing}
            resetProductForm={resetProductForm}
            handleSaveProduct={handleSaveProduct}
            handleAdminImageUpload={handleAdminImageUpload}
            openProductPreview={openProductPreview}
          />
        )}

        {!shouldRedirectToDefaultTab && activeTab === 'freshnessReports' && !isStaff && (
          <FreshnessVerificationReportsPanel
            items={freshnessReportsData.items}
            total={freshnessReportsData.total}
            page={freshnessReportsData.page}
            limit={freshnessReportsData.limit}
            totalPages={freshnessReportsData.total_pages}
            loading={freshnessReportsLoading}
            filters={freshnessReportFilters}
            exporting={freshnessReportsExporting}
            onFilterChange={(field, value) => setFreshnessReportFilters((prev) => ({ ...prev, [field]: value, page: 1 }))}
            onPageChange={(page) => setFreshnessReportFilters((prev) => ({ ...prev, page }))}
            onExport={handleExportFreshnessReports}
          />
        )}

        {!shouldRedirectToDefaultTab && activeTab === 'feedback' && !isStaff && (
          <AIFeedbackPanel
            items={feedbackData.items}
            total={feedbackData.total}
            counts={feedbackData}
            filter={feedbackFilters.status}
            verdict={feedbackFilters.verdict}
            search={feedbackFilters.search}
            page={feedbackData.page}
            totalPages={feedbackData.total_pages}
            loading={feedbackLoading}
            markingId={markingFeedbackId}
            onFilterChange={(status) => setFeedbackFilters((prev) => ({ ...prev, status, page: 1 }))}
            onVerdictChange={(verdict) => setFeedbackFilters((prev) => ({ ...prev, verdict, page: 1 }))}
            onSearchChange={(search) => setFeedbackFilters((prev) => ({ ...prev, search, page: 1 }))}
            onPageChange={(page) => setFeedbackFilters((prev) => ({ ...prev, page }))}
            onRefresh={() => loadFeedback(feedbackFilters)}
            onMarkRead={handleMarkFeedbackRead}
          />
        )}

        {!shouldRedirectToDefaultTab && activeTab === 'settings' && !isStaff && (
          <SettingsPanel
            settingsSection={settingsSection}
            setSettingsSection={setSettingsSection}
            paymentQr={paymentQr}
            paymentQrDraft={paymentQrDraft}
            setPaymentQrDraft={setPaymentQrDraft}
            paymentQrLoading={paymentQrLoading}
            paymentQrSaving={paymentQrSaving}
            paymentQrDragActive={paymentQrDragActive}
            setPaymentQrDragActive={setPaymentQrDragActive}
            handlePaymentQrFileChange={handlePaymentQrFileChange}
            handleSavePaymentQr={handleSavePaymentQr}
            loadPaymentQr={loadPaymentQr}
          />
        )}
      </AdminShell>

      <ProductPreviewModal
        product={selectedProductPreview}
        categoryLabel={previewCategoryLabel}
        onClose={closeProductPreview}
      />

      <ProductFormModal
        isOpen={isProductModalOpen}
        editingProductId={editingProductId}
        productForm={productForm}
        setProductForm={setProductForm}
        imagePreview={imagePreview}
        loading={loading}
        isImageProcessing={isImageProcessing}
        categoryDirectory={categoryDirectory}
        handleSaveProduct={handleSaveProduct}
        handleAdminImageUpload={handleAdminImageUpload}
        closeProductModal={closeProductModal}
      />
    </>
  );
};

export default AdminDashboard;

