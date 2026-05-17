import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import ProductDetail from '../components/ProductDetail';
import MarketCategorySidebar from '../components/common/MarketCategorySidebar';
import ProductCardGrid from '../components/common/ProductCardGrid';
import { getProducts } from '../services/api';
import {
  getPromotionBadge,
  marketCategories,
  matchesMarketCategory,
} from '../data/marketNavigation';
import { uiControl, uiLayout } from '../styles/uiTokens';

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const Products = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [dataCategory, setDataCategory] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);
  const [addedToCart, setAddedToCart] = useState(null);

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
        const data = await getProducts();
        if (isMounted) {
          setProducts(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || 'Không tải được sản phẩm');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const productCategories = useMemo(
    () => [...new Set(products.map((product) => product.category).filter(Boolean))],
    [products]
  );

  const selectedMarketCategory = useMemo(
    () => marketCategories.find((category) => category.id === selectedCategoryId) || null,
    [selectedCategoryId]
  );

  const filteredProducts = useMemo(() => {
    const search = normalizeText(searchQuery);
    let result = [...products];

    if (selectedMarketCategory) {
      result = result.filter((product) => matchesMarketCategory(product, selectedMarketCategory));
    }

    if (dataCategory) {
      result = result.filter((product) => product.category === dataCategory);
    }

    if (search) {
      result = result.filter((product) => {
        const haystack = normalizeText(
          [product.name, product.category, product.description].filter(Boolean).join(' ')
        );
        return haystack.includes(search);
      });
    }

    if (sortBy === 'price_asc') {
      result.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sortBy === 'rating_desc') {
      result.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    } else if (sortBy === 'name_asc') {
      result.sort((a, b) => String(a.name).localeCompare(String(b.name), 'vi'));
    }

    return result;
  }, [products, searchQuery, selectedMarketCategory, dataCategory, sortBy]);

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
    setSearchQuery(keyword);
    setSelectedCategoryId(group);
    updateUrl({ q: keyword, group });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategoryId('');
    setDataCategory('');
    setSortBy('');
    navigate('/shop');
  };

  const handleAddToCart = (product) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: Number(product.price) || 0,
      img: product.img,
      image_url: product.image_url,
      category: product.category,
      rating: product.rating,
    });

    setAddedToCart(product.id);
    setTimeout(() => setAddedToCart(null), 1600);
  };

  return (
    <div className={uiLayout.page}>
      <div className={uiLayout.container}>
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
          <Link to="/" className="hover:text-emerald-700">Trang chủ</Link>
          <ChevronRight size={15} />
          <span className="text-slate-900">Danh mục sản phẩm</span>
        </div>

        <div className="fresh-layout-grid">
          <MarketCategorySidebar
            activeCategoryId={selectedCategoryId}
            onSelectCategory={handleCategorySelect}
            onSelectKeyword={handleKeywordSelect}
          />

          <main className={`fresh-main-column ${uiLayout.sectionStack}`}>
            <MarketCategorySidebar
              compact
              activeCategoryId={selectedCategoryId}
              onSelectCategory={handleCategorySelect}
              onSelectKeyword={handleKeywordSelect}
            />

            <section className={uiLayout.sectionCard}>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black uppercase tracking-normal text-emerald-700">
                    <Filter size={15} />
                    Khu mua hàng
                  </div>
                  <h1 className="text-2xl font-black text-slate-950 md:text-3xl">Danh mục sản phẩm</h1>
                  <p className="mt-1 text-sm font-medium text-slate-600">
                    Lọc nhanh theo nhóm hàng, tìm kiếm từ khóa và chọn mua trực tiếp trên từng thẻ sản phẩm.
                  </p>
                </div>

                <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 ring-1 ring-amber-200">
                  {filteredProducts.length} sản phẩm phù hợp
                </div>
              </div>

              <form onSubmit={handleSearchSubmit} className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
                <label className="block">
                  <span className={uiControl.fieldLabel}>Tìm kiếm</span>
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
                  <span className={uiControl.fieldLabel}>Danh mục dữ liệu</span>
                  <select
                    value={dataCategory}
                    onChange={(event) => setDataCategory(event.target.value)}
                    className={uiControl.input}
                  >
                    <option value="">Tất cả</option>
                    {productCategories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className={uiControl.fieldLabel}>Sắp xếp</span>
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
                  <button
                    type="submit"
                    className={`${uiControl.primaryButton} flex-1 lg:flex-none`}
                  >
                    <SlidersHorizontal size={17} />
                    Lọc
                  </button>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className={uiControl.secondaryIconButton}
                    aria-label="Xóa bộ lọc"
                  >
                    <X size={18} />
                  </button>
                </div>
              </form>

              {(selectedMarketCategory || searchQuery || dataCategory) && (
                <div className="mt-6 flex flex-wrap gap-2">
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
                  {dataCategory && (
                    <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
                      Dữ liệu: {dataCategory}
                    </span>
                  )}
                </div>
              )}
            </section>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                {error}
              </div>
            )}

            {loading ? (
              <div className={uiLayout.sectionCardLg}>
                <p className="text-center text-sm font-semibold text-slate-500">Đang tải sản phẩm...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className={uiLayout.sectionCardLg}>
                <p className="text-lg font-black text-slate-900">Không tìm thấy sản phẩm phù hợp</p>
                <p className="mt-2 text-sm text-slate-500">Thử xóa bộ lọc hoặc tìm từ khóa ngắn hơn.</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
                >
                  Xem tất cả sản phẩm
                </button>
              </div>
            ) : (
              <ProductCardGrid
                products={filteredProducts}
                getBadge={(product, index) => getPromotionBadge(product, index)}
                addedProductId={addedToCart}
                onAddToCart={handleAddToCart}
                onOpenDetail={(item) => setSelectedProductDetail(item.id)}
              />
            )}
          </main>
        </div>

        {selectedProductDetail && (
          <ProductDetail
            productId={selectedProductDetail}
            onClose={() => setSelectedProductDetail(null)}
          />
        )}
      </div>
    </div>
  );
};

export default Products;
