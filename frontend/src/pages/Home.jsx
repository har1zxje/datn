import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, ShoppingBasket } from 'lucide-react';
import MarketCategorySidebar from '../components/common/MarketCategorySidebar';
import ProductCardGrid from '../components/common/ProductCardGrid';
import NutriHeaderHero from '../components/home/NutriHeaderHero';
import ProductDetail from '../components/ProductDetail';
import { useCart } from '../context/CartContext';
import { getProducts } from '../services/api';
import { getPromotionBadge } from '../data/marketNavigation';
import { uiLayout } from '../styles/uiTokens';

const fallbackProducts = [
  {
    id: 'fallback-tomato',
    name: 'Ca chua huu co Da Lat',
    price: 35000,
    category: 'Rau cu sach',
    rating: 4.9,
    stock: 24,
    img: 'https://images.unsplash.com/photo-1546470427-0d4b954cb8b1?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'fallback-lettuce',
    name: 'Xa lach thuy canh',
    price: 25000,
    category: 'Rau an la',
    rating: 4.8,
    stock: 18,
    img: 'https://images.unsplash.com/photo-1556801712-76c820ac4281?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'fallback-salmon',
    name: 'Ca hoi fillet tuoi',
    price: 185000,
    category: 'Thit, ca, hai san',
    rating: 4.9,
    stock: 10,
    img: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'fallback-chicken',
    name: 'Uc ga sach khong khang sinh',
    price: 78000,
    category: 'Thit sach',
    rating: 4.7,
    stock: 16,
    img: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'fallback-apple',
    name: 'Tao nhap khau gion ngot',
    price: 92000,
    category: 'Trai cay',
    rating: 4.8,
    stock: 30,
    img: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'fallback-milk',
    name: 'Sua tuoi thanh trung',
    price: 39000,
    category: 'Sua cac loai',
    rating: 4.8,
    stock: 22,
    img: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'fallback-spices',
    name: 'Bo gia vi nau an tien loi',
    price: 56000,
    category: 'Gia vi',
    rating: 4.6,
    stock: 20,
    img: 'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'fallback-rice',
    name: 'Gao sach thom mem 5kg',
    price: 145000,
    category: 'Gao, bot, do kho',
    rating: 4.9,
    stock: 12,
    img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=800&auto=format&fit=crop',
  },
];

const Home = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addedToCart, setAddedToCart] = useState(null);
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      try {
        const data = await getProducts();
        if (isMounted) {
          setProducts(data.length ? data : fallbackProducts);
        }
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

  const campaignProducts = useMemo(() => displayProducts.slice(0, 8), [displayProducts]);
  const freshProducts = useMemo(() => {
    const source = displayProducts.slice(4, 12);
    return source.length >= 4 ? source : displayProducts.slice(0, 8);
  }, [displayProducts]);

  const goSearch = (keyword) => {
    navigate(`/shop?q=${encodeURIComponent(keyword)}`);
  };

  const handleCategorySelect = (category) => {
    if (!category) {
      navigate('/shop');
      return;
    }
    navigate(`/shop?group=${category.id}`);
  };

  const handleKeywordSelect = (keyword) => {
    goSearch(keyword);
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
        <div className="fresh-layout-grid">
          <MarketCategorySidebar
            activeCategoryId=""
            onSelectCategory={handleCategorySelect}
            onSelectKeyword={handleKeywordSelect}
          />

          <main className={`fresh-main-column ${uiLayout.sectionStack}`}>
            <MarketCategorySidebar
              compact
              activeCategoryId=""
              onSelectCategory={handleCategorySelect}
              onSelectKeyword={handleKeywordSelect}
            />

            <NutriHeaderHero
              onOpenScanner={() => navigate('/scanner')}
              onOpenShop={() => navigate('/shop')}
            />

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-5 md:p-6">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.06em] text-amber-700">Chuong trinh noi bat</p>
                  <h2 className="text-xl font-black text-slate-950">Tuan le song xanh</h2>
                </div>
                <button
                  type="button"
                  onClick={() => goSearch('mua 2 tang 1')}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white transition-all duration-300 hover:bg-slate-800"
                >
                  Xem tat ca
                  <ChevronRight size={16} />
                </button>
              </div>

              {loading ? (
                <div className="rounded-lg bg-white p-8 text-center text-sm font-semibold text-slate-500">
                  Dang tai san pham...
                </div>
              ) : (
                <ProductCardGrid
                  products={campaignProducts}
                  getBadge={(product, index) => getPromotionBadge(product, index)}
                  addedProductId={addedToCart}
                  onAddToCart={handleAddToCart}
                  onOpenDetail={openProductDetail}
                />
              )}
            </section>

            <section className={uiLayout.sectionCard}>
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.06em] text-emerald-700">Lua chon tuoi moi</p>
                  <h2 className="text-xl font-black text-slate-950">Goi y cho bua an gia dinh</h2>
                </div>
                <Link
                  to="/shop"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 px-4 py-3 text-sm font-black text-emerald-700 transition-all duration-300 hover:bg-emerald-50"
                >
                  Vao cua hang
                  <ShoppingBasket size={16} />
                </Link>
              </div>

              <ProductCardGrid
                products={freshProducts}
                getBadge={(_, index) => (index % 3 === 0 ? 'Tuoi moi hom nay' : undefined)}
                addedProductId={addedToCart}
                onAddToCart={handleAddToCart}
                onOpenDetail={openProductDetail}
              />
            </section>
          </main>
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
