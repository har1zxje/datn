import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, ShoppingBasket } from 'lucide-react';
import ProductCardGrid from '../components/common/ProductCardGrid';
import NutriHeaderHero from '../components/home/NutriHeaderHero';
import ProductDetail from '../components/ProductDetail';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { getProducts } from '../services/api';
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
  const [loading, setLoading] = useState(true);
  const [addedToCart, setAddedToCart] = useState(null);
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadProducts = async () => {
      try {
        const data = await getProducts();
        if (isMounted) setProducts(data.length ? data : fallbackProducts);
      } catch {
        if (isMounted) setProducts(fallbackProducts);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadProducts();
    return () => { isMounted = false; };
  }, []);

  const displayProducts = products.length ? products : fallbackProducts;
  const campaignProducts = useMemo(() => displayProducts.slice(0, 8), [displayProducts]);
  const freshProducts = useMemo(() => {
    const source = displayProducts.slice(4, 12);
    return source.length >= 4 ? source : displayProducts.slice(0, 8);
  }, [displayProducts]);

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

          {/* Chương trình nổi bật */}
          <section className="rounded-[30px] border border-amber-200/70 bg-[linear-gradient(180deg,rgba(253,248,230,0.95),rgba(255,255,255,0.96))] p-6 shadow-[0_20px_44px_rgba(217,169,52,0.14)] md:p-8 lg:p-9">
            <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">{t('home_highlight')}</p>
                <h2 className="text-xl font-black text-slate-950">{t('home_week_green')}</h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Goi y nhom san pham duoc mua nhieu trong ngay, giu cue khuyen mai nhung uu tien kha nang quet nhanh va ra quyet dinh.
                </p>
              </div>
              <button
                type="button"
                onClick={() => goSearch('mua 2 tặng 1')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)] transition-all hover:bg-slate-800"
              >
                {t('home_see_all')}
                <ChevronRight size={16} />
              </button>
            </div>

            {loading ? (
              <div className="rounded-xl bg-white p-9 text-center text-sm font-semibold text-slate-500">
                {t('common_loading_products')}
              </div>
            ) : (
              <ProductCardGrid
                products={campaignProducts}
                getBadge={(product, index) => getPromotionBadge(product, index)}
                addedProductId={addedToCart}
                onAddToCart={handleAddToCart}
                onOpenDetail={openProductDetail}
                disableAddToCart={!canUseCart}
              />
            )}
          </section>

          {/* Lựa chọn tươi mới */}
          <section className={`${uiLayout.sectionCard} bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(242,248,243,0.9))]`}>
            <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">{t('home_fresh_choices')}</p>
                <h2 className="text-xl font-black text-slate-950">{t('home_family_meals')}</h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Lua chon de dua vao bua an hang ngay, du lieu that va thao tac mua nhanh duoc dat cung mot nhom.
                </p>
              </div>
              <Link
                to="/shop"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-black text-emerald-700 transition-all hover:bg-emerald-50"
              >
                {t('home_enter_shop')}
                <ShoppingBasket size={16} />
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
