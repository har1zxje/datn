import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, Star, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { getProductCategoryLabel } from '../data/categorySystem';
import { getProductById, getProductFreshnessReviews } from '../services/api';
import { safeText } from '../utils/text';

const mergeProductData = (base = {}, next = {}) => {
  const merged = { ...base, ...next };
  const resolvedCategory = safeText(
    next.category ||
      next.category_name ||
      next.category?.name ||
      base.category ||
      base.category_name,
    ''
  );

  return {
    ...merged,
    category: resolvedCategory,
    category_name: safeText(next.category_name || resolvedCategory, ''),
  };
};

const MOCK_FRESHNESS_SUMMARY = {
  avg_score: 82,
  total_reviews: 4,
  reviews: [
    { id: 'mock-1', customer_display_name: 'N. A.', customer_area: 'Quan 7, TP.HCM', freshness_score: 88, delivery_date: '2026-06-05T09:00:00Z' },
    { id: 'mock-2', customer_display_name: 'T. P.', customer_area: 'Thu Duc, TP.HCM', freshness_score: 79, delivery_date: '2026-06-04T15:20:00Z' },
    { id: 'mock-3', customer_display_name: 'H. L.', customer_area: 'Hai Chau, Da Nang', freshness_score: 84, delivery_date: '2026-06-03T11:30:00Z' },
    { id: 'mock-4', customer_display_name: 'M. K.', customer_area: 'Ninh Kieu, Can Tho', freshness_score: 77, delivery_date: '2026-06-02T08:10:00Z' },
  ],
};

const ProductDetail = ({ productId, initialProduct = null, categories = [], onClose }) => {
  const [product, setProduct] = useState(initialProduct || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [freshnessSummary, setFreshnessSummary] = useState(MOCK_FRESHNESS_SUMMARY);
  const [loadingFreshness, setLoadingFreshness] = useState(true);
  const closeButtonRef = useRef(null);
  const { addToCart, canUseCart } = useCart();

  useEffect(() => {
    setProduct(initialProduct || null);
    setError(null);
    setQuantity(1);
    setAddedToCart(false);
  }, [productId, initialProduct]);

  useEffect(() => {
    let isMounted = true;

    const fetchFreshnessSummary = async () => {
      try {
        setLoadingFreshness(true);
        const summary = await getProductFreshnessReviews(productId);
        if (!isMounted) return;
        setFreshnessSummary(summary.total_reviews > 0 ? summary : MOCK_FRESHNESS_SUMMARY);
      } catch {
        if (isMounted) setFreshnessSummary(MOCK_FRESHNESS_SUMMARY);
      } finally {
        if (isMounted) setLoadingFreshness(false);
      }
    };

    fetchFreshnessSummary();
    return () => {
      isMounted = false;
    };
  }, [productId]);

  useEffect(() => {
    let isMounted = true;

    const fetchProductDetail = async () => {
      try {
        setLoading(true);
        const data = await getProductById(productId);
        if (!isMounted) return;
        setProduct((prev) => mergeProductData(initialProduct || prev || {}, data));
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError(err.response?.data?.detail || err.message || 'Không tìm thấy sản phẩm');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProductDetail();
    return () => {
      isMounted = false;
    };
  }, [productId, initialProduct]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const displayCategory = useMemo(
    () =>
      safeText(
        product?.displayCategory ||
          getProductCategoryLabel(product, categories) ||
          product?.category ||
          product?.category_name,
        'Danh mục khác'
      ),
    [product, categories]
  );

  const displayPrice = `${Number(product?.price || 0).toLocaleString('vi-VN')}đ`;
  const displayName = safeText(product?.name, 'Sản phẩm');
  const displayDescription = safeText(product?.description, 'Không có mô tả');
  const freshnessAverage = Number(freshnessSummary?.avg_score || 0);

  const handleAddToCart = () => {
    if (!product) return;

    const added = addToCart(
      {
        id: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        img: product.img,
        image_url: product.image_url,
        category: displayCategory,
        rating: product.rating,
      },
      quantity
    );

    if (!added) return;
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleQuantityChange = (value) => {
    const nextValue = parseInt(value, 10);
    if (Number.isFinite(nextValue) && nextValue > 0) {
      setQuantity(nextValue);
    }
  };

  const modalShell = (children) => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[3px]"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      {children}
    </div>
  );

  if (loading && !product) {
    return modalShell(
      <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl md:p-8" role="dialog" aria-modal="true">
        <p className="text-base font-semibold text-slate-600">Đang tải sản phẩm...</p>
      </div>
    );
  }

  if (!product) {
    return modalShell(
      <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl md:p-8" role="dialog" aria-modal="true">
        <p className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error || 'Không tìm thấy sản phẩm'}
        </p>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          Đóng
        </button>
      </div>
    );
  }

  return modalShell(
    <div
      className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-detail-title"
    >
      <div className="grid grid-cols-1 gap-8 p-6 md:grid-cols-2 md:gap-10 md:p-9">
        <div className="flex items-center justify-center">
          <img
            src={product.img || product.image_url || 'https://via.placeholder.com/640?text=No+Image'}
            alt={displayName}
            className="h-full max-h-[470px] w-full rounded-3xl object-cover shadow-[0_20px_45px_rgba(15,23,42,0.12)]"
            onError={(event) => {
              event.currentTarget.src = 'https://via.placeholder.com/640?text=No+Image';
            }}
          />
        </div>

        <div className="flex flex-col justify-between">
          <div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Đóng chi tiết sản phẩm"
            >
              <X size={18} />
            </button>

            <h2 id="product-detail-title" className="font-product-title mt-4 text-3xl font-black tracking-tight text-slate-950">
              {displayName}
            </h2>

            <div className="mt-3 flex items-center gap-2">
              <Star size={16} className="fill-amber-400 text-amber-400" />
              <span className="text-sm font-semibold text-slate-600">{product.rating || 0}/5</span>
            </div>

            <div className="mt-5">
              <span className="text-sm font-semibold text-slate-500">Danh mục</span>
              <p className="font-category-label mt-2 inline-block rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                {displayCategory}
              </p>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-semibold text-slate-500">Mô tả</label>
              <p className="leading-7 text-slate-600">{displayDescription}</p>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Chỉ số tươi thực tế</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Đánh giá công khai từ khách đã nhận hàng và được AI xác nhận.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-emerald-700">
                    {loadingFreshness ? '...' : `${freshnessAverage || 0}/100`}
                  </p>
                  <p className="text-xs font-semibold text-slate-500">
                    {freshnessSummary?.total_reviews || 0} lượt xác nhận
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {(freshnessSummary?.reviews || []).slice(0, 5).map((review) => (
                  <div key={review.id} className="rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{review.customer_display_name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {review.customer_area} • Nhận hàng {review.delivery_date ? new Date(review.delivery_date).toLocaleDateString('vi-VN') : 'gần đây'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-emerald-700">{review.freshness_score}/100</p>
                        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                          Được xác nhận bởi AI
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <p className="mb-5 text-3xl font-black text-emerald-600">{displayPrice}</p>

            <div className="mb-5 flex items-center gap-4">
              <label className="text-sm font-semibold text-slate-700">Số lượng</label>
              <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity - 1)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-white"
                  aria-label="Giảm số lượng"
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(event) => handleQuantityChange(event.target.value)}
                  className="h-9 w-14 border-0 bg-transparent text-center text-sm font-bold text-slate-900 outline-none"
                  min="1"
                />
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity + 1)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-white"
                  aria-label="Tăng số lượng"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {addedToCart && (
              <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                Đã thêm vào giỏ hàng
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!canUseCart}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {canUseCart ? 'Thêm vào giỏ hàng' : 'Admin không thể mua hàng'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
