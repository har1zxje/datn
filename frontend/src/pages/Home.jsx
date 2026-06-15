import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import ProductCardGrid from '../components/common/ProductCardGrid';
import NutriHeaderHero from '../components/home/NutriHeaderHero';
import ProductDetail from '../components/ProductDetail';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { getFeaturedProducts, getProducts } from '../services/api';
import { getPromotionBadge } from '../data/marketNavigation';
import { uiLayout } from '../styles/uiTokens';

const fallbackProducts = [
  {
    id: 'fallback-tomato',
    name: 'Cà chua hữu cơ Đà Lạt',
    price: 35000,
    category: 'Rau củ sạch',
    rating: 4.9,
    stock: 24,
    img: 'https://images.unsplash.com/photo-1546470427-0d4b954cb8b1?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'fallback-lettuce',
    name: 'Xà lách thủy canh',
    price: 25000,
    category: 'Rau ăn lá',
    rating: 4.8,
    stock: 18,
    img: 'https://images.unsplash.com/photo-1556801712-76c820ac4281?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'fallback-salmon',
    name: 'Cá hồi fillet tươi',
    price: 185000,
    category: 'Thịt, cá, hải sản',
    rating: 4.9,
    stock: 10,
    img: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'fallback-chicken',
    name: 'Ức gà sạch không kháng sinh',
    price: 78000,
    category: 'Thịt sạch',
    rating: 4.7,
    stock: 16,
    img: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'fallback-apple',
    name: 'Táo nhập khẩu giòn ngọt',
    price: 92000,
    category: 'Trái cây',
    rating: 4.8,
    stock: 30,
    img: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'fallback-milk',
    name: 'Sữa tươi thanh trùng',
    price: 39000,
    category: 'Sữa các loại',
    rating: 4.8,
    stock: 22,
    img: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'fallback-spices',
    name: 'Bộ gia vị nấu ăn tiện lợi',
    price: 56000,
    category: 'Gia vị',
    rating: 4.6,
    stock: 20,
    img: 'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'fallback-rice',
    name: 'Gạo sạch thơm mềm 5kg',
    price: 145000,
    category: 'Gạo, bột, đồ khô',
    rating: 4.9,
    stock: 12,
    img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=800&auto=format&fit=crop',
  },
];

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, canUseCart } = useCart();
  const { t } = useAppSettings();
  const [products, setProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addedToCart, setAddedToCart] = useState(null);
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      try {
        const [productData, featuredData] = await Promise.all([getProducts(), getFeaturedProducts()]);
        if (!isMounted) return;
        setProducts(productData.length ? productData : fallbackProducts);
        setFeaturedProducts(featuredData);
      } catch {
        if (!isMounted) return;
        setProducts(fallbackProducts);
        setFeaturedProducts([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  const displayProducts = products.length ? products : fallbackProducts;

  const featuredShowcaseProducts = useMemo(
    () => featuredProducts.slice(0, 5),
    [featuredProducts],
  );

  const featuredButtonCls =
    'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-50';

  const freshProducts = useMemo(() => {
    const featuredIds = new Set(featuredShowcaseProducts.map((product) => product.id));
    const source = displayProducts.filter((product) => !featuredIds.has(product.id)).slice(5, 13);
    return source.length >= 4 ? source : displayProducts.slice(0, 8);
  }, [displayProducts, featuredShowcaseProducts]);

  const goSearch = (keyword) => {
    navigate(`/shop?q=${encodeURIComponent(keyword)}`);
  };

  const handleAddToCart = (product) => {
    const added = addToCart({
      id: product.id,
      name: product.name,
      price: Number(product.price) || 0,
      img: product.img,
      image_url: product.image_url,
      category: product.category,
      rating: product.rating,
    });
    if (!added) return;
    setAddedToCart(product.id);
    setTimeout(() => setAddedToCart(null), 1600);
  };

  const openProductDetail = (product) => {
    if (String(product.id).startsWith('fallback')) {
      goSearch(product.name);
      return;
    }
    setSelectedProductDetail(product.id);
  };

  return (
    <div className={uiLayout.page}>
      <div className={uiLayout.container}>
        <div className={uiLayout.sectionStack}>
          <NutriHeaderHero
            onOpenFreshness={() => navigate(user ? '/profile' : '/auth', user ? { state: { tab: 'orders' } } : undefined)}
            onOpenShop={() => navigate('/shop')}
          />

          {loading || featuredShowcaseProducts.length > 0 ? (
            <section className="overflow-hidden rounded-[32px] border border-emerald-200/80 bg-[linear-gradient(135deg,rgba(241,251,245,0.96),rgba(255,255,255,0.98)_58%,rgba(233,246,238,0.96))] p-6 shadow-[0_22px_48px_rgba(22,101,52,0.10)] md:p-8 lg:p-9">
              <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <h2 className="text-xl font-black text-slate-950 md:text-[1.7rem]">Sản phẩm đang nổi bật</h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link to="/shop" className={featuredButtonCls}>
                    {t('home_enter_shop')}
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </div>

              {loading ? (
                <div className="rounded-[24px] border border-white/80 bg-white/85 p-9 text-center text-sm font-semibold text-slate-500">
                  {t('common_loading_products')}
                </div>
              ) : (
                <ProductCardGrid
                  products={featuredShowcaseProducts}
                  getBadge={(product, index) => getPromotionBadge(product, index)}
                  addedProductId={addedToCart}
                  onAddToCart={handleAddToCart}
                  onOpenDetail={openProductDetail}
                  disableAddToCart={!canUseCart}
                />
              )}
            </section>
          ) : null}

          <section className={`${uiLayout.sectionCard} bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(242,248,243,0.9))]`}>
            <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">{t('home_family_meals')}</h2>
              </div>
              <Link to="/shop" className={featuredButtonCls}>
                {t('home_enter_shop')}
                <ChevronRight size={16} />
              </Link>
            </div>

            <ProductCardGrid
              products={freshProducts}
              getBadge={(_, index) => (index % 3 === 0 ? t('home_fresh_today') : undefined)}
              addedProductId={addedToCart}
              onAddToCart={handleAddToCart}
              onOpenDetail={openProductDetail}
              disableAddToCart={!canUseCart}
            />
          </section>
        </div>
      </div>

      {selectedProductDetail && (
        <ProductDetail
          productId={selectedProductDetail}
          onClose={() => setSelectedProductDetail(null)}
        />
      )}
    </div>
  );
};

export default Home;
