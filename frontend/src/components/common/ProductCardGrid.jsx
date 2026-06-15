import React from 'react';
import { Heart, ShoppingCart } from 'lucide-react';
import { useFavorites } from '../../context/FavoritesContext';
import { buildCategoryDirectory, getProductCategoryLabel } from '../../data/categorySystem';
import { safeText } from '../../utils/text';
import './ProductCardGrid.css';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=640&auto=format&fit=crop';
const FALLBACK_CATEGORY_DIRECTORY = buildCategoryDirectory();

const formatPrice = (value) => {
  const number = Number(value || 0);
  return `${number.toLocaleString('vi-VN')}đ`;
};

const resolveDiscountBadge = (product, index, getBadge) => {
  const discountPercent = Number(product?.discount_percent ?? 0);
  if (Number.isFinite(discountPercent) && discountPercent > 0) {
    return `-${Math.round(discountPercent)}%`;
  }

  const rawBadge = safeText(getBadge?.(product, index), '');
  if (!rawBadge) return '';

  const matchedPercent = rawBadge.match(/(\d+)\s*%/);
  if (matchedPercent?.[1]) return `-${matchedPercent[1]}%`;
  return rawBadge;
};

const resolveOriginalPrice = (product) => {
  const currentPrice = Number(product?.price ?? product?.discount_price ?? 0);
  const listedPrice = Number(
    product?.original_price ??
      product?.base_price ??
      product?.list_price ??
      product?.market_price ??
      product?.regular_price ??
      0
  );
  if (Number.isFinite(listedPrice) && listedPrice > currentPrice) return listedPrice;

  const discountPercent = Number(product?.discount_percent ?? 0);
  if (Number.isFinite(discountPercent) && discountPercent > 0 && discountPercent < 100 && currentPrice > 0) {
    return Math.round(currentPrice / (1 - discountPercent / 100));
  }

  return 0;
};

const resolveSoldCount = (product) =>
  Number(
    product?.sold_count ??
      product?.total_sold ??
      product?.units_sold ??
      product?.quantity_sold ??
      product?.sales_count ??
      0
  );

const formatSoldLabel = (value) => {
  const count = Math.max(0, Number(value || 0));
  if (count === 0) return '0 đã bán';
  if (count < 1000) return `${count.toLocaleString('vi-VN')} đã bán`;

  const compact = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: count >= 100000 ? 0 : 1,
  }).format(count);

  return `${compact.toLowerCase()}+ đã bán`;
};

const resolveCategoryLabel = (product, categoryLabelOverride = '') =>
  safeText(
    categoryLabelOverride ||
      product?.displayCategory ||
      getProductCategoryLabel(product, FALLBACK_CATEGORY_DIRECTORY) ||
      product?.category ||
      product?.category_name ||
      product?.category?.name,
    'Danh mục khác'
  );

const ProductCardGrid = ({
  products = [],
  onAddToCart,
  onOpenDetail,
  getBadge,
  addedProductId,
  disableAddToCart = false,
  categoryLabelOverride = '',
}) => {
  const { isFavorite, toggleFavorite } = useFavorites();

  return (
    <div className="product-card-grid">
      {products.map((product, index) => {
        const badge = resolveDiscountBadge(product, index, getBadge);
        const image = product?.img || product?.image_url || PLACEHOLDER_IMAGE;
        const stock = Number(product?.stock ?? product?.quantity ?? 0);
        const soldCount = resolveSoldCount(product);
        const isOutOfStock = stock <= 0;
        const addToCartLocked = disableAddToCart || isOutOfStock;
        const hasProductId = product?.id !== undefined && product?.id !== null;
        const added = hasProductId && addedProductId === product?.id;
        const liked = hasProductId ? isFavorite(product?.id) : false;
        const productName = safeText(product?.name, 'Sản phẩm');
        const categoryLabel = resolveCategoryLabel(product, categoryLabelOverride);
        const originalPrice = resolveOriginalPrice(product);
        const price = Number(product?.price ?? product?.discount_price ?? 0);
        const productKey = product?.id ?? `${productName}-${index}`;

        return (
          <article key={productKey} className="product-card-modern">
            <div className="product-card-modern__media">
              <button
                type="button"
                onClick={() => onOpenDetail?.(product)}
                className="product-card-modern__media-button"
                aria-label={`Xem chi tiết ${productName}`}
              >
                <img
                  src={image}
                  alt={productName}
                  className="product-card-modern__image"
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.src = PLACEHOLDER_IMAGE;
                  }}
                />
              </button>

              {badge && <span className="product-card-modern__discount-badge">{safeText(badge)}</span>}

              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!hasProductId) return;
                  toggleFavorite(product?.id);
                }}
                className={`product-card-modern__favorite-button ${
                  liked ? 'product-card-modern__favorite-button--active' : ''
                }`}
                aria-label={liked ? 'Bỏ yêu thích' : 'Thêm yêu thích'}
              >
                <Heart size={15} className={liked ? 'fill-current' : ''} strokeWidth={2.2} />
              </button>

              {isOutOfStock && <span className="product-card-modern__stock-badge">Hết hàng</span>}
            </div>

            <div className="product-card-modern__body">
              <button
                type="button"
                onClick={() => onOpenDetail?.(product)}
                className="product-card-modern__title-button"
              >
                <span className="product-card-modern__title">{productName}</span>
              </button>

              <div className="product-card-modern__meta-row">
                <span className="product-card-modern__category">{categoryLabel}</span>
                {originalPrice > price && (
                  <span className="product-card-modern__original-price">{formatPrice(originalPrice)}</span>
                )}
              </div>

              <div className="product-card-modern__price-row">
                <p className="product-card-modern__price">{formatPrice(price)}</p>
                <span className="product-card-modern__sold">{formatSoldLabel(soldCount)}</span>
              </div>

              <div className="product-card-modern__actions">
                <button
                  type="button"
                  onClick={() => onOpenDetail?.(product)}
                  className="product-card-modern__secondary-action"
                >
                  Chi tiết
                </button>

                <button
                  type="button"
                  disabled={addToCartLocked}
                  onClick={() => onAddToCart?.(product)}
                  className={`product-card-modern__primary-action ${
                    added ? 'product-card-modern__primary-action--added' : ''
                  }`}
                  aria-label={`Thêm ${productName} vào giỏ`}
                >
                  <ShoppingCart size={15} strokeWidth={2.2} />
                  {added ? 'Đã thêm' : isOutOfStock ? 'Hết hàng' : 'Thêm giỏ'}
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default ProductCardGrid;
