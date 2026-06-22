import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import ProductDetail from '../components/ProductDetail';
import MarketFilterSidebar from '../components/common/MarketFilterSidebar';
import ProductCardGrid from '../components/common/ProductCardGrid';
import { useAppSettings } from '../context/AppSettingsContext';
import { getCategories, getProducts, PRODUCT_SYNC_EVENT } from '../services/api';
import { getPromotionBadge } from '../data/marketNavigation';
import {
  buildCategoryDirectory,
  getProductCategoryLabel,
  matchProductInCategory,
} from '../data/categorySystem';
import { uiLayout } from '../styles/uiTokens';
import { safeText } from '../utils/text';

const normalizeText = (value) => String(value || '').trim().toLowerCase();
const sanitizeDigits = (value) => String(value || '').replace(/[^\d]/g, '');
const PRODUCTS_PER_PAGE = 12;
const LIVE_REFRESH_INTERVAL_MS = 15000;

const FALLBACK_PRODUCTS = [
  {
    id: 'fallback-wagyu',
    name: 'Wagyu A5 NutriGro',
    category: 'Thịt và hải sản',
    description: 'Thịt bò cao cấp cắt sẵn, phù hợp bữa tối gia đình.',
    price: 485000,
    rating: 4.9,
    stock: 8,
    sold_count: 126,
    img: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'fallback-thannoi',
    name: 'Thăn nội bò Úc grass-fed',
    category: 'Thịt và hải sản',
    description: 'Thịt mềm, ít mỡ, dễ chế biến món áp chảo và nướng.',
    price: 329000,
    rating: 4.8,
    stock: 10,
    sold_count: 93,
    img: 'https://images.unsplash.com/photo-1615937657715-bc7b4b7962b1?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'fallback-salmon',
    name: 'Cá hồi Na Uy fillet premium',
    category: 'Thịt và hải sản',
    description: 'Phần fillet tươi, đóng gói lạnh, thích hợp sushi và áp chảo.',
    price: 279000,
    rating: 4.8,
    stock: 13,
    sold_count: 144,
    img: 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'fallback-cod',
    name: 'Cá tuyết Alaska nhập khẩu',
    category: 'Thịt và hải sản',
    description: 'Thịt cá chắc, ít xương, hợp nấu lẩu và chiên giòn.',
    price: 319000,
    rating: 4.7,
    stock: 11,
    sold_count: 77,
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
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);
  const [addedToCart, setAddedToCart] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchQuery(params.get('q') || '');
    setSelectedCategoryId(params.get('group') || '');
    setMinPrice(sanitizeDigits(params.get('minPrice') || ''));
    setMaxPrice(sanitizeDigits(params.get('maxPrice') || ''));
  }, [location.search]);

  useEffect(() => {
    let isMounted = true;

    const syncCatalog = async ({ showLoading = false } = {}) => {
      if (showLoading && isMounted) setLoading(true);

      try {
        const [productData, categoryData] = await Promise.all([getProducts(), getCategories()]);
        if (!isMounted) return;

        setProducts(productData.length ? productData : FALLBACK_PRODUCTS);
        if (categoryData.length) setCategories(categoryData);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || 'Không tải được sản phẩm');
      } finally {
        if (isMounted && showLoading) setLoading(false);
      }
    };

    const handleProductSync = () => {
      syncCatalog({ showLoading: false });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncCatalog({ showLoading: false });
      }
    };

    syncCatalog({ showLoading: true });
    const intervalId = window.setInterval(() => {
      syncCatalog({ showLoading: false });
    }, LIVE_REFRESH_INTERVAL_MS);

    window.addEventListener(PRODUCT_SYNC_EVENT, handleProductSync);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener(PRODUCT_SYNC_EVENT, handleProductSync);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const categoryDirectory = useMemo(() => buildCategoryDirectory(categories), [categories]);

  const selectedMarketCategory = useMemo(
    () => categoryDirectory.find((category) => String(category.id) === String(selectedCategoryId)) || null,
    [categoryDirectory, selectedCategoryId]
  );

  const filteredProducts = useMemo(() => {
    const search = normalizeText(searchQuery);
    const result = [...products];
    const minPriceValue = Number(minPrice || 0);
    const maxPriceValue = Number(maxPrice || 0);

    let nextProducts = result;

    if (selectedMarketCategory) {
      nextProducts = nextProducts.filter((product) =>
        matchProductInCategory(product, selectedMarketCategory, categoryDirectory)
      );
    }

    if (minPrice) {
      nextProducts = nextProducts.filter((product) => Number(product.price || 0) >= minPriceValue);
    }

    if (maxPrice) {
      nextProducts = nextProducts.filter((product) => Number(product.price || 0) <= maxPriceValue);
    }

    if (search) {
      nextProducts = nextProducts.filter((product) => {
        const productName = normalizeText(product.name);
        return productName.includes(search);
      });
    }

    return nextProducts;
  }, [products, searchQuery, selectedMarketCategory, minPrice, maxPrice, categoryDirectory]);

  const catalogProducts = useMemo(
    () =>
      filteredProducts.map((product) => ({
        ...product,
        displayCategory: getProductCategoryLabel(product, categoryDirectory) || safeText(product.category, 'Danh mục khác'),
      })),
    [filteredProducts, categoryDirectory]
  );

  const totalPages = Math.max(1, Math.ceil(catalogProducts.length / PRODUCTS_PER_PAGE));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return catalogProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [catalogProducts, currentPage]);

  useEffect(() => setCurrentPage(1), [searchQuery, selectedCategoryId, minPrice, maxPrice]);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const buildPaginationItems = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
    if (currentPage <= 3) return [1, 2, 3, '...', totalPages];
    if (currentPage >= totalPages - 2) return [1, '...', totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const updateUrl = ({
    q = searchQuery,
    group = selectedCategoryId,
    nextMinPrice = minPrice,
    nextMaxPrice = maxPrice,
  } = {}) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (group) params.set('group', group);
    if (nextMinPrice) params.set('minPrice', nextMinPrice);
    if (nextMaxPrice) params.set('maxPrice', nextMaxPrice);
    const nextQuery = params.toString();
    navigate(nextQuery ? `/shop?${nextQuery}` : '/shop', { replace: true });
  };

  const handleCategorySelect = (category) => {
    const group = category?.id || '';
    setSelectedCategoryId(group);
    updateUrl({ group, q: searchQuery, nextMinPrice: minPrice, nextMaxPrice: maxPrice });
  };

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    updateUrl({ q: value, group: selectedCategoryId, nextMinPrice: minPrice, nextMaxPrice: maxPrice });
  };

  const handleMinPriceChange = (value) => {
    const nextValue = sanitizeDigits(value);
    setMinPrice(nextValue);
    updateUrl({ q: searchQuery, group: selectedCategoryId, nextMinPrice: nextValue, nextMaxPrice: maxPrice });
  };

  const handleMaxPriceChange = (value) => {
    const nextValue = sanitizeDigits(value);
    setMaxPrice(nextValue);
    updateUrl({ q: searchQuery, group: selectedCategoryId, nextMinPrice: minPrice, nextMaxPrice: nextValue });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategoryId('');
    setMinPrice('');
    setMaxPrice('');
    navigate('/shop', { replace: true });
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
          <Link to="/" className="hover:text-emerald-700">
            {t('nav_home')}
          </Link>
          <ChevronRight size={15} />
          <span className="text-slate-900">{t('products_title')}</span>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[320px_minmax(0,1fr)] xl:gap-10">
          <aside className="hidden lg:block">
            <MarketFilterSidebar
              searchQuery={searchQuery}
              activeCategoryId={selectedCategoryId}
              minPrice={minPrice}
              maxPrice={maxPrice}
              matchingCount={filteredProducts.length}
              categories={categoryDirectory}
              language={language}
              onSearchChange={handleSearchChange}
              onSelectCategory={handleCategorySelect}
              onMinPriceChange={handleMinPriceChange}
              onMaxPriceChange={handleMaxPriceChange}
              onClearFilters={clearFilters}
            />
          </aside>

          <main className={`fresh-main-column ${uiLayout.sectionStack}`}>
            <div className="lg:hidden">
              <MarketFilterSidebar
                searchQuery={searchQuery}
                activeCategoryId={selectedCategoryId}
                minPrice={minPrice}
                maxPrice={maxPrice}
                matchingCount={filteredProducts.length}
                categories={categoryDirectory}
                language={language}
                sticky={false}
                onSearchChange={handleSearchChange}
                onSelectCategory={handleCategorySelect}
                onMinPriceChange={handleMinPriceChange}
                onMaxPriceChange={handleMaxPriceChange}
                onClearFilters={clearFilters}
              />
            </div>

            {(selectedMarketCategory || searchQuery || minPrice || maxPrice) && (
              <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                <div className="flex flex-wrap gap-2">
                  {selectedMarketCategory && (
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                      Danh mục: {safeText(selectedMarketCategory.backendName || selectedMarketCategory.label || selectedMarketCategory.name)}
                    </span>
                  )}
                  {searchQuery && (
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                      Từ khóa: {safeText(searchQuery)}
                    </span>
                  )}
                  {(minPrice || maxPrice) && (
                    <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
                      Giá: {minPrice ? Number(minPrice).toLocaleString('vi-VN') : '0'} - {maxPrice ? Number(maxPrice).toLocaleString('vi-VN') : '...'}
                    </span>
                  )}
                </div>
              </section>
            )}

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
                    ? safeText(
                        selectedMarketCategory.cardTag ||
                          selectedMarketCategory.label ||
                          selectedMarketCategory.name
                      )
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

                {buildPaginationItems().map((item, index) =>
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
                    <span key={`ellipsis-${index}`} className="px-2 text-slate-400">
                      ...
                    </span>
                  )
                )}

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