import React from 'react';
import { ShoppingCart } from 'lucide-react';

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/640x640?text=NutriGro';

const formatPrice = (value) => {
  const number = Number(value || 0);
  return `${number.toLocaleString('vi-VN')}đ`;
};

const ProductCardGrid = ({
  products = [],
  onAddToCart,
  onOpenDetail,
  getBadge,
  addedProductId,
}) => (
  <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {products.map((product, index) => {
      const badge = getBadge?.(product, index);
      const image = product?.img || product?.image_url || PLACEHOLDER_IMAGE;
      const isOutOfStock = Number(product?.stock ?? product?.quantity ?? 0) <= 0;
      const added = addedProductId === product.id;

      return (
        <article
          key={product.id}
          className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
        >
          <button
            type="button"
            onClick={() => onOpenDetail?.(product)}
            className="relative block w-full overflow-hidden bg-gray-50"
            aria-label={`Xem chi tiết ${product?.name || 'sản phẩm'}`}
          >
            <img
              src={image}
              alt={product?.name || 'San pham'}
              className="aspect-square w-full bg-gray-50 object-cover"
              loading="lazy"
              onError={(event) => {
                event.currentTarget.src = PLACEHOLDER_IMAGE;
              }}
            />

            {badge && (
              <span className="absolute left-2 top-2 rounded-sm bg-amber-400 px-1.5 py-0.5 text-xs font-medium text-amber-950">
                {badge}
              </span>
            )}

            {isOutOfStock && (
              <span className="absolute bottom-2 left-2 rounded-sm bg-gray-900/80 px-1.5 py-0.5 text-xs font-medium text-white">
                Tạm hết hàng
              </span>
            )}
          </button>

          <div className="flex flex-1 flex-col space-y-2 p-4">
            <button
              type="button"
              onClick={() => onOpenDetail?.(product)}
              className="line-clamp-2 min-h-10 text-start text-sm font-normal text-gray-800 hover:text-emerald-700"
            >
              {product?.name}
            </button>

            <div className="mt-auto flex items-end justify-between gap-2">
              <p className="text-lg font-semibold text-emerald-600">
                {formatPrice(product?.price)}
              </p>

              <button
                type="button"
                disabled={isOutOfStock}
                onClick={() => onAddToCart?.(product)}
                className="rounded-full bg-emerald-50 p-2.5 text-emerald-600 transition-colors hover:bg-emerald-600 hover:text-white disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                aria-label={`Thêm ${product?.name || 'sản phẩm'} vào giỏ`}
              >
                <ShoppingCart size={15} />
              </button>
            </div>

            {added && (
              <p className="rounded-sm bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                Đã thêm vào giỏ hàng
              </p>
            )}
          </div>
        </article>
      );
    })}
  </div>
);

export default ProductCardGrid;
