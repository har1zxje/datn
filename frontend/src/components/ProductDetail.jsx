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

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/960x960?text=No+Image';
const EMPTY_FRESHNESS_SUMMARY = { avg_score: null, total_reviews: 0, reviews: [] };

const ProductDetail = ({ productId, initialProduct = null, categories = [], onClose }) => {
  const [product, setProduct] = useState(initialProduct || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [freshnessSummary, setFreshnessSummary] = useState(EMPTY_FRESHNESS_SUMMARY);
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
        setFreshnessSummary(summary.total_reviews > 0 ? summary : EMPTY_FRESHNESS_SUMMARY);
      } catch {
        if (isMounted) setFreshnessSummary(EMPTY_FRESHNESS_SUMMARY);
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
  const freshnessAverage =
    freshnessSummary?.avg_score == null || Number.isNaN(Number(freshnessSummary?.avg_score))
      ? null
      : Number(freshnessSummary.avg_score);
  const stock = Number(product?.stock ?? product?.quantity ?? 0);
  const isOutOfStock = stock <= 0;
  const isLowStock = !isOutOfStock && stock <= 5;

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
      className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-slate-950/65 p-3 backdrop-blur-[4px] sm:p-5 md:p-8"
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
      className="relative my-auto w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.985),rgba(244,248,245,0.97))] shadow-[0_28px_80px_rgba(15,23,42,0.28)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-detail-title"
    >
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-500 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur transition hover:bg-white hover:text-slate-700"
        aria-label="Đóng chi tiết sản phẩm"
      >
        <X size={18} />
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.15fr)]">
        <div className="border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(234,246,239,0.9),rgba(255,255,255,0.96))] p-5 sm:p-6 lg:border-b-0 lg:border-r lg:p-8">
          <div className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_24px_54px_rgba(15,23,42,0.12)]">
            <div className="aspect-[4/4.2] w-full overflow-hidden bg-slate-100">
              <img
                src={product.img || product.image_url || PLACEHOLDER_IMAGE}
                alt={displayName}
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.src = PLACEHOLDER_IMAGE;
                }}
              />
            </div>
          </div>

          <div className="mt-5 rounded-[26px] border border-emerald-100/80 bg-white/92 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-600">Chỉ số đánh giá độ tươi</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Tổng hợp từ các lượt xác minh sau giao.
                </p>
              </div>
              <div className="rounded-[22px] bg-emerald-50 px-4 py-3 text-right">
                <p className="text-3xl font-black text-emerald-700">
                  {loadingFreshness ? '...' : freshnessAverage == null ? '--/100' : `${freshnessAverage}/100`}
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  {freshnessSummary?.total_reviews || 0} lượt xác nhận
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-[20px] bg-slate-50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-700">
                {loadingFreshness
                  ? 'Đang tải dữ liệu độ tươi...'
                  : freshnessSummary?.total_reviews > 0
                    ? 'Điểm này dựa trên phản hồi thật của khách đã nhận hàng.'
                    : 'Sản phẩm này chưa có phản hồi độ tươi công khai.'}
              </p>
            </div>
          </div>
        </div>

        <div className="max-h-[calc(100vh-2rem)] overflow-y-auto p-5 pr-3 sm:p-6 sm:pr-4 md:p-8 md:pr-5">
          <div className="mx-auto max-w-2xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                Chi tiết sản phẩm
              </span>
              <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-700">
                <Star size={15} className="fill-amber-400 text-amber-400" />
                <span>{product.rating || 0}/5</span>
              </div>
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                {displayCategory}
              </span>
              <span
                className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${
                  isOutOfStock
                    ? 'bg-slate-200 text-slate-700'
                    : isLowStock
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {isOutOfStock ? 'Tạm hết hàng' : isLowStock ? `Sắp hết, còn ${stock}` : `Sẵn sàng, còn ${stock}`}
              </span>
            </div>

            <h2 id="product-detail-title" className="font-product-title mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-[2.2rem]">
              {displayName}
            </h2>

            <div className="mt-5 rounded-[26px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
              <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Mô tả</label>
              <p className="text-[15px] leading-7 text-slate-600">{displayDescription}</p>
            </div>

            <div className="mt-6 rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,rgba(236,253,245,0.88),rgba(255,255,255,0.96))] p-5 shadow-[0_20px_40px_rgba(16,185,129,0.08)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Giá hiện tại</p>
                  <p className="mt-2 text-3xl font-black text-emerald-600">{displayPrice}</p>
                </div>

                <div className="flex items-center gap-4">
                  <label className="text-sm font-semibold text-slate-700">Số lượng</label>
                  <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(quantity - 1)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-50"
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
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-50"
                      aria-label="Tăng số lượng"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {addedToCart && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700">
                  Đã thêm vào giỏ hàng
                </div>
              )}

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!canUseCart || isOutOfStock}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isOutOfStock ? 'Tạm hết hàng' : 'Thêm vào giỏ'}
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
    </div>
  );
};

export default ProductDetail;
