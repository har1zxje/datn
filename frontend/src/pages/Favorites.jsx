import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Heart, HeartOff, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProductCardGrid from '../components/common/ProductCardGrid';
import ProductDetail from '../components/ProductDetail';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { getProducts } from '../services/api';
import { uiLayout } from '../styles/uiTokens';

const Favorites = () => {
  const navigate = useNavigate();
  const { addToCart, canUseCart } = useCart();
  const { favoriteIds } = useFavorites();
  const { t } = useAppSettings();
  const [products, setProducts] = useState([]);
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);
  const [addedToCart, setAddedToCart] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const allProducts = await getProducts();
        if (mounted) setProducts(allProducts);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const favoriteProducts = useMemo(() => {
    const favoriteSet = new Set(favoriteIds.map(String));
    return products.filter((item) => favoriteSet.has(String(item.id)));
  }, [products, favoriteIds]);

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

  return (
    <div className={uiLayout.page}>
      <div className={uiLayout.container}>
        <section className="overflow-hidden rounded-[30px] border border-[color:var(--line-soft)] bg-[linear-gradient(135deg,rgba(244,63,94,0.08),rgba(15,154,98,0.08),rgba(255,255,255,0.96))] p-6 shadow-[var(--shadow-soft)] md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-600">{t('fav_personal')}</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-[2.7rem]">{t('fav_title')}</h1>
            </div>

            <div className="flex items-center lg:justify-end">
              <p className="text-sm font-semibold text-slate-600 md:text-base">
                {t('fav_saved')} <span className="font-black text-slate-950">{favoriteProducts.length}</span> {t('fav_saved_suffix')}
              </p>
            </div>
          </div>
        </section>

        {loading ? (
          <div className={`${uiLayout.sectionCardLg} mt-8 text-center`}>
            <ShoppingBag className="mx-auto text-slate-300" size={34} />
            <p className="mt-4 text-sm font-semibold text-slate-500">{t('common_loading_products')}</p>
          </div>
        ) : favoriteProducts.length === 0 ? (
          <div className={`${uiLayout.sectionCardLg} mt-8 text-center`}>
            <HeartOff className="mx-auto text-slate-300" size={42} />
            <h2 className="mt-4 text-xl font-black text-slate-900">{t('fav_empty')}</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              {t('fav_empty_desc')}
            </p>
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-[0_14px_28px_rgba(5,150,105,0.22)] transition hover:bg-emerald-700"
            >
              {t('fav_explore')}
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="rounded-[28px] border border-[color:var(--line-soft)] bg-white px-5 py-4 shadow-[var(--shadow-soft)]">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-black text-slate-950">Danh sách đã lưu</p>
                  <p className="text-xs font-semibold text-slate-500">Mở nhanh để xem chi tiết hoặc thêm vào giỏ.</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700">
                  <Heart size={13} />
                  {favoriteProducts.length} sản phẩm yêu thích
                </div>
              </div>
            </div>

            <ProductCardGrid
              products={favoriteProducts}
              addedProductId={addedToCart}
              onAddToCart={handleAddToCart}
              onOpenDetail={(item) => setSelectedProductDetail(item.id)}
              disableAddToCart={!canUseCart}
            />
          </div>
        )}
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

export default Favorites;
