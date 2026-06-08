import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Filter, Search, SlidersHorizontal, Sparkles, Tags, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import ProductDetail from '../components/ProductDetail';
import MarketCategorySidebar from '../components/common/MarketCategorySidebar';
import ProductCardGrid from '../components/common/ProductCardGrid';
import { useAppSettings } from '../context/AppSettingsContext';
import { getCategories, getProducts, PRODUCT_SYNC_EVENT } from '../services/api';
import { getMarketQuickDeals, getPromotionBadge, getSmartSearchSuggestions } from '../data/marketNavigation';
import {
  buildCategoryDirectory,
  getProductCategoryLabel,
  getProductCategoryTag,
  mapProductToCategoryId,
  matchProductInCategory,
} from '../data/categorySystem';
import { uiControl, uiLayout } from '../styles/uiTokens';
import { safeText } from '../utils/text';

const normalizeText = (value) => String(value || '').trim().toLowerCase();
const PRODUCTS_PER_PAGE = 12;

const FALLBACK_PRODUCTS = [
  {
    id: 'fallback-wagyu',
    name: 'Thịt bò Wagyu A5 cắt mỏng FreshFood',
    category: 'Thịt & Hải sản',
    price: 485000,
    rating: 4.9,
    stock: 8,
    img: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'fallback-thannoi',
    name: 'Thăn nội bò Úc grass-fed FreshFood',
    category: 'Thịt & Hải sản',
    price: 329000,
    rating: 4.8,
    stock: 10,
    img: 'https://images.unsplash.com/photo-1615937657715-bc7b4b7962b1?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'fallback-salmon',
    name: 'Cá hồi Na Uy fillet premium',
    category: 'Thịt & Hải sản',
    price: 279000,
    rating: 4.8,
    stock: 13,
    img: 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'fallback-cod',
    name: 'Cá tuyết Alaska nhập khẩu',
    category: 'Thịt & Hải sản',
    price: 319000,
    rating: 4.7,
    stock: 11,
    img: 'https://images.unsplash.com/photo-1510130387422-82bed34b37e9?q=80&w=800&auto=format&fit=crop',
  },
];

const Products = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToCart, canUseCart } = useCart();
  const { language, t } = useAppSettings();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [dataCategoryId, setDataCategoryId] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);
  const [addedToCart, setAddedToCart] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchQuery(params.get('q') || '');
    setSelectedCategoryId(params.get('group') || '');
  }, [location.search]);

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        const [productData, categoryData] = await Promise.all([getProducts(), getCategories()]);
        if (isMounted) {
          setProducts(productData.length ? productData : FALLBACK_PRODUCTS);
          setCategories(categoryData);
          setError(null);
        }
      } catch (err) {
        if (isMounted) setError(err?.message || 'Không tải được sản phẩm');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProducts();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const handleProductSync = (event) => {
      const detail = event?.detail || {};
      if (detail.type === 'remove') {
        setProducts((prev) => prev.filter((item) => item.id !== detail.productId));
        return;
      }
      if (detail.type === 'upsert' && detail.product) {
        setProducts((prev) => {
          const exists = prev.some((item) => item.id === detail.product.id);
          if (!exists) return [detail.product, ...prev];
          return prev.map((item) => (item.id === detail.product.id ? { ...item, ...detail.product } : item));
        });
      }
    };

    window.addEventListener(PRODUCT_SYNC_EVENT, handleProductSync);
    return () => window.removeEventListener(PRODUCT_SYNC_EVENT, handleProductSync);
  }, []);

  const categoryDirectory = useMemo(() => buildCategoryDirectory(categories), [categories]);
  const quickDeals = useMemo(() => getMarketQuickDeals(language), [language]);
  const quickSuggestions = useMemo(() => getSmartSearchSuggestions(language), [language]);
  const selectedMarketCategory = useMemo(
    () => categoryDirectory.find((category) => String(category.id) === String(selectedCategoryId)) || null,
    [categoryDirectory, selectedCategoryId]
  );
  const selectedDataCategory = useMemo(
    () => categoryDirectory.find((category) => String(category.id) === String(dataCategoryId)) || null,
    [categoryDirectory, dataCategoryId]
  );

  const filteredProducts = useMemo(() => {
    const search = normalizeText(searchQuery);
    let result = [...products];

    if (selectedMarketCategory) {
      result = result.filter((product) => matchProductInCategory(product, selectedMarketCategory, categoryDirectory));
    }
    if (dataCategoryId) {
      result = result.filter((product) => mapProductToCategoryId(product, categoryDirectory) === dataCategoryId);
    }
    if (search) {
      result = result.filter((product) => {
        const haystack = normalizeText([product.name, product.category, product.description].filter(Boolean).join(' '));
        return haystack.includes(search);
      });
    }

    if (sortBy === 'price_asc') result.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sortBy === 'price_desc') result.sort((a, b) => Number(b.price) - Number(a.price));
    else if (sortBy === 'rating_desc') result.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    else if (sortBy === 'name_asc') result.sort((a, b) => safeText(a.name).localeCompare(safeText(b.name), 'vi'));

    return result;
  }, [products, searchQuery, selectedMarketCategory, dataCategoryId, sortBy, categoryDirectory]);

  const catalogProducts = useMemo(
    () => filteredProducts.map((product) => ({
      ...product,
      displayCategory:
        (selectedMarketCategory
          ? safeText(
              selectedMarketCategory.backendName ||
              selectedMarketCategory.cardTag ||
              selectedMarketCategory.label ||
              selectedMarketCategory.name
            )
          : '') ||
        getProductCategoryLabel(product, categoryDirectory) ||
        getProductCategoryTag(product, categoryDirectory) ||
        safeText(product.category, 'Danh mục khác'),
    })),
    [filteredProducts, categoryDirectory, selectedMarketCategory]
  );

  const totalPages = Math.max(1, Math.ceil(catalogProducts.length / PRODUCTS_PER_PAGE));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return catalogProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [catalogProducts, currentPage]);

  useEffect(() => setCurrentPage(1), [searchQuery, selectedCategoryId, dataCategoryId, sortBy]);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const buildPaginationItems = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
    if (currentPage <= 3) return [1, 2, 3, '...', totalPages];
    if (currentPage >= totalPages - 2) return [1, '...', totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const updateUrl = ({ q = searchQuery, group = selectedCategoryId } = {}) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (group) params.set('group', group);
    const nextQuery = params.toString();
    navigate(nextQuery ? `/shop?${nextQuery}` : '/shop');
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    updateUrl({ q: searchQuery });
  };

  const handleCategorySelect = (category) => {
    const group = category?.id || '';
    setSelectedCategoryId(group);
    updateUrl({ group, q: searchQuery });
  };

  const handleKeywordSelect = (keyword, category) => {
    const group = category?.id || '';
    if (!keyword) {
      setSelectedCategoryId(group);
      updateUrl({ q: searchQuery, group });
      return;
    }
    setSearchQuery(keyword);
    setSelectedCategoryId(group);
    updateUrl({ q: keyword, group });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategoryId('');
    setDataCategoryId('');
    setSortBy('');
    navigate('/shop');
  };

  const handleAddToCart = (product) => {
    const resolvedCategory =
      safeText(product.displayCategory) ||
      getProductCategoryLabel(product, categoryDirectory) ||
      safeText(product.category);

    const added = addToCart({
      id: product.id,
      name: safeText(product.name),
      price: Number(product.price) || 0,
      img: product.img,
      image_url: product.image_url,
      category: resolvedCategory,
      rating: product.rating,
    });

    if (!added) return;
    setAddedToCart(product.id);
    setTimeout(() => setAddedToCart(null), 1600);
  };

  const handleOpenDetail = (product) => {
    if (String(product?.id || '').startsWith('fallback')) return;
    setSelectedProductDetail(product);
  };

  return (
    <div className={uiLayout.page}>
      <div className={uiLayout.container}>
        <div className="mb-8 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
          <Link to="/" className="hover:text-emerald-700">{t('nav_home')}</Link>
          <ChevronRight size={15} />
          <span className="text-slate-900">{t('products_title')}</span>
        </div>

        <div className="grid gap-10 lg:grid-cols-[300px_minmax(0,1fr)]">
          <MarketCategorySidebar
            activeCategoryId={selectedCategoryId}
            categories={categoryDirectory}
            onSelectCategory={handleCategorySelect}
            onSelectKeyword={handleKeywordSelect}
          />

          <main className={`fresh-main-column ${uiLayout.sectionStack}`}>
            <MarketCategorySidebar
              compact
              activeCategoryId={selectedCategoryId}
              categories={categoryDirectory}
              onSelectCategory={handleCategorySelect}
              onSelectKeyword={handleKeywordSelect}
            />

            <section className={`${uiLayout.sectionCard} bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(243,247,240,0.92))]`}>
              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">
                    <Filter size={15} />
                    Khu mua hàng
                  </div>
                  <h1 className="text-2xl font-black text-slate-950 md:text-3xl">Danh mục sản phẩm</h1>
                  <p className="mt-2 max-w-2xl text-sm font-medium leading-7 text-slate-600">
                    Lọc nhanh theo nhóm hàng, tìm kiếm từ khóa và chọn mua trực tiếp trên từng thẻ sản phẩm.
                  </p>
                </div>

                <div className="rounded-[22px] bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-[0_16px_32px_rgba(15,23,42,0.18)]">
                  {filteredProducts.length} {t('products_match_count')}
                </div>
              </div>

              <form onSubmit={handleSearchSubmit} className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_260px_240px_auto]">
                <label className="block">
                  <span className={uiControl.fieldLabel}>TÌM KIẾM</span>
                  <span className={uiControl.fieldShell}>
                    <Search size={18} className="shrink-0 text-slate-400" />
                    <input
                      type="search"
                      placeholder="Tìm sản phẩm, món ăn, nguyên liệu..."
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className={uiControl.iconInput}
                    />
                  </span>
                </label>

                <label className="block">
                  <span className={uiControl.fieldLabel}>DANH MỤC DỮ LIỆU</span>
                  <select
                    value={dataCategoryId}
                    onChange={(event) => setDataCategoryId(event.target.value)}
                    className={uiControl.input}
                  >
                    <option value="">Tất cả</option>
                    {categoryDirectory.map((category) => (
                      <option key={category.id} value={category.id}>{category.label || category.name}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className={uiControl.fieldLabel}>SẮP XẾP</span>
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    className={uiControl.input}
                  >
                    <option value="">Mặc định</option>
                    <option value="price_asc">Giá thấp đến cao</option>
                    <option value="price_desc">Giá cao đến thấp</option>
                    <option value="rating_desc">Đánh giá cao nhất</option>
                    <option value="name_asc">Tên A-Z</option>
                  </select>
                </label>

                <div className="flex items-end gap-2">
                  <button type="submit" className={`${uiControl.primaryButton} flex-1 lg:flex-none`}>
                    <SlidersHorizontal size={17} />
                    {t('products_filter')}
                  </button>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className={uiControl.secondaryIconButton}
                    aria-label={t('products_clear')}
                  >
                    <X size={18} />
                  </button>
                </div>
              </form>

              {/* Quick deals & suggestions */}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-slate-400">
                  {language === 'en' ? 'Quick:' : 'Gợi ý:'}
                </span>
                {quickDeals.map((deal) => (
                  <button
                    key={deal.value}
                    type="button"
                    onClick={() => {
                      setSearchQuery(deal.label);
                      updateUrl({ q: deal.label });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 hover:border-emerald-300"
                  >
                    <Tags size={11} />
                    {deal.label}
                  </button>
                ))}
                {quickSuggestions.slice(0, 4).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setSearchQuery(suggestion);
                      updateUrl({ q: suggestion });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
                  >
                    <Sparkles size={11} />
                    {suggestion}
                  </button>
                ))}
              </div>

              {(selectedMarketCategory || searchQuery || selectedDataCategory) && (
                <div className="mt-7 flex flex-wrap gap-2.5">
                  {selectedMarketCategory && (
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                      Nhóm: {selectedMarketCategory.label}
                    </span>
                  )}
                  {searchQuery && (
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                      Từ khóa: {searchQuery}
                    </span>
                  )}
                  {selectedDataCategory && (
                    <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
                      Dữ liệu: {selectedDataCategory.label || selectedDataCategory.name}
                    </span>
                  )}
                </div>
              )}
            </section>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-bold text-rose-700">
                {safeText(error)}
              </div>
            )}

            {loading ? (
              <div className={uiLayout.sectionCardLg}>
                <p className="text-center text-sm font-semibold text-slate-500">{t('common_loading_products')}</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className={uiLayout.sectionCardLg}>
                <p className="text-lg font-black text-slate-900">{t('products_none')}</p>
                <p className="mt-2 text-sm text-slate-500">{t('products_try_again')}</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
                >
                  {t('products_show_all')}
                </button>
              </div>
            ) : (
              <ProductCardGrid
                products={paginatedProducts}
                getBadge={(product, index) => getPromotionBadge(product, index)}
                addedProductId={addedToCart}
                onAddToCart={handleAddToCart}
                onOpenDetail={handleOpenDetail}
                disableAddToCart={!canUseCart}
                categoryLabelOverride={
                  selectedMarketCategory
                    ? safeText(selectedMarketCategory.cardTag || selectedMarketCategory.label || selectedMarketCategory.name)
                    : ''
                }
              />
            )}

            {catalogProducts.length > PRODUCTS_PER_PAGE && (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                >
                  Trước
                </button>

                {buildPaginationItems().map((item, index) => (
                  typeof item === 'number' ? (
                    <button
                      key={`${item}-${index}`}
                      type="button"
                      onClick={() => setCurrentPage(item)}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                        currentPage === item
                          ? 'bg-emerald-600 text-white'
                          : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {item}
                    </button>
                  ) : (
                    <span key={`ellipsis-${index}`} className="px-2 text-slate-400">...</span>
                  )
                ))}

                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
            )}
          </main>
        </div>

        {selectedProductDetail && (
          <ProductDetail
            productId={selectedProductDetail.id}
            initialProduct={selectedProductDetail}
            categories={categoryDirectory}
            onClose={() => setSelectedProductDetail(null)}
          />
        )}
      </div>
    </div>
  );
};

export default Products;
