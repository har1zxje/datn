import React from 'react';
import { Heart, ShoppingCart, Star } from 'lucide-react';
import { useFavorites } from '../../context/FavoritesContext';
import { safeText } from '../../utils/text';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=640&auto=format&fit=crop';

const formatPrice = (value) => {
  const number = Number(value || 0);
  return `${number.toLocaleString('vi-VN')}d`;
};

const RatingStars = ({ rating }) => {
  const score = Math.max(0, Math.min(5, Number(rating) || 0));
  const fullStars = Math.floor(score);
  const hasHalf = score - fullStars >= 0.5;

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => {
          if (i < fullStars) {
            return <Star key={i} size={11} className="fill-amber-400 text-amber-400" />;
          }
          if (i === fullStars && hasHalf) {
            return (
              <span key={i} className="relative inline-block">
                <Star size={11} className="text-slate-200" />
                <span className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                  <Star size={11} className="fill-amber-400 text-amber-400" />
                </span>
              </span>
            );
          }
          return <Star key={i} size={11} className="text-slate-200" />;
        })}
      </div>
      <span className="text-[11px] font-bold text-amber-700">{score.toFixed(1)}</span>
    </div>
  );
};

const ProductCardGrid = ({
  products = [],
  onAddToCart,
  onOpenDetail,
  getBadge,
  addedProductId,
  categoryLabelOverride = '',
  disableAddToCart = false,
}) => {
  const { isFavorite, toggleFavorite } = useFavorites();

  return (
    <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product, index) => {
        const badge = getBadge?.(product, index);
        const image = product?.img || product?.image_url || PLACEHOLDER_IMAGE;
        const stock = Number(product?.stock ?? product?.quantity ?? 0);
        const isOutOfStock = stock <= 0;
        const isLowStock = !isOutOfStock && stock <= 5;
        const addToCartLocked = disableAddToCart || isOutOfStock;
        const added = addedProductId === product.id;
        const liked = isFavorite(product.id);
        const productName = safeText(product?.name, 'San pham');
        const productCategory = safeText(
          categoryLabelOverride || product?.displayCategory || product?.category,
          'San pham tuoi'
        );
        const hasRating = Number(product?.rating) > 0;

        return (
          <article
            key={product.id}
            className="group relative flex flex-col overflow-hidden rounded-[28px] border border-[color:var(--line-soft)] bg-[color:var(--surface-0)] shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200"
          >
            <div className="relative overflow-hidden border-b border-[color:var(--line-soft)]">
              <button
                type="button"
                onClick={() => onOpenDetail?.(product)}
                className="block w-full text-left"
                aria-label={`Xem chi tiet ${productName}`}
              >
                <div className="aspect-[4/4.2] w-full overflow-hidden bg-[color:var(--surface-1)]">
                  <img
                    src={image}
                    alt={productName}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.src = PLACEHOLDER_IMAGE;
                    }}
                  />
                </div>
              </button>

              {(badge || isOutOfStock || isLowStock) && (
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-slate-950/20 to-transparent" />
              )}

              {badge && (
                <span className="absolute left-3 top-3 rounded-full bg-amber-300 px-3 py-1 text-[11px] font-black text-slate-950 shadow-sm">
                  {safeText(badge)}
                </span>
              )}

              {isOutOfStock && (
                <span className="absolute left-3 top-3 rounded-full bg-slate-950/85 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                  Tam het hang
                </span>
              )}

              {isLowStock && !isOutOfStock && !badge && (
                <span className="absolute left-3 top-3 rounded-full bg-amber-500/90 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                  Sap het, con {stock}
                </span>
              )}

              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  toggleFavorite(product.id);
                }}
                className={`absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full shadow-md transition-all duration-200 ${
                  liked
                    ? 'border border-rose-200 bg-rose-50 text-rose-500 scale-110'
                    : 'border border-white/60 bg-white/92 text-slate-400 backdrop-blur-sm hover:scale-110 hover:text-rose-500'
                }`}
                aria-label={liked ? 'Bo yeu thich' : 'Them yeu thich'}
              >
                <Heart size={15} className={liked ? 'fill-current' : ''} />
              </button>
            </div>

            <div className="flex flex-1 flex-col p-4 md:p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <p className="font-category-label text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                  {productCategory}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                    isOutOfStock
                      ? 'bg-slate-200 text-slate-700'
                      : isLowStock
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {isOutOfStock ? 'Het hang' : isLowStock ? `Con ${stock}` : 'San sang'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onOpenDetail?.(product)}
                className="mb-2 line-clamp-2 text-left text-[15px] font-black leading-[1.45] text-slate-900 transition group-hover:text-emerald-700"
              >
                {productName}
              </button>

              {hasRating && (
                <div className="mb-3">
                  <RatingStars rating={product.rating} />
                </div>
              )}

              <div className="mt-auto rounded-[22px] bg-[color:var(--surface-1)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Gia hien tai</p>
                    <p className="text-lg font-black leading-none text-emerald-700">
                      {formatPrice(product?.price)}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={addToCartLocked}
                    onClick={() => onAddToCart?.(product)}
                    className={`inline-flex h-11 min-w-[132px] items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black transition-all duration-200 ${
                      added
                        ? 'bg-emerald-600 text-white'
                        : addToCartLocked
                          ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                    aria-label={`Them ${productName} vao gio`}
                  >
                    <ShoppingCart size={15} />
                    {added ? 'Da them' : isOutOfStock ? 'Het hang' : 'Them gio'}
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-white/70 pt-3 text-xs font-semibold text-slate-500">
                  <span>{hasRating ? 'Khach da danh gia' : 'Moi len ke'}</span>
                  <button
                    type="button"
                    onClick={() => onOpenDetail?.(product)}
                    className="text-emerald-700 transition hover:text-emerald-800"
                  >
                    Xem chi tiet
                  </button>
                </div>
              </div>

              {added && (
                <p className="mt-2.5 rounded-xl bg-emerald-50 px-3 py-2 text-center text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                  Da them vao gio hang
                </p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default ProductCardGrid;
