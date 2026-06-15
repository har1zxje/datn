import { Edit3, Eye, ImagePlus, Loader2, PackagePlus, Search } from 'lucide-react';
import { formatCompactNumber, formatMoney } from '../../../utils/admin/formatters';
import { getStockBadge, getStockRowTint } from '../../../utils/admin/stockHelpers';
import { mapProductToCategoryId } from '../../../data/categorySystem';
import {
  breakAnywhereClass,
  FEATURED_PRODUCT_LIMIT,
  PRODUCT_BADGE_SELECT_OPTIONS,
  PRODUCT_VIEW_MODES,
  getProductBadgeOptionValue,
  textInputClass,
} from '../../../constants/adminDashboard';
import EmptyState from '../shared/EmptyState';
import NumericPaginationBar from '../shared/NumericPaginationBar';
import SegmentedToggle from '../shared/SegmentedToggle';
import StockLevel from '../shared/StockLevel';

const getPromotionLabel = (product) =>
  product.promotion_label || (product.discount_percent ? `-${Math.round(product.discount_percent)}%` : '');

const getCategoryLabel = (product, categoryDirectory) =>
  categoryDirectory.find((item) => item.id === mapProductToCategoryId(product, categoryDirectory))?.label ||
  product.category ||
  'Khác';

const PriceBlock = ({ product, align = 'left' }) => {
  const hasDiscount = Number(product.original_price || 0) > Number(product.price || 0);

  return (
    <div className={`space-y-1 ${align === 'right' ? 'text-right' : ''}`}>
      <p className="text-base font-black text-emerald-700">{formatMoney(product.price)}</p>
      {hasDiscount ? (
        <p className="text-xs font-semibold text-slate-400 line-through">{formatMoney(product.original_price)}</p>
      ) : null}
    </div>
  );
};

const BadgeSelect = ({ product, disabled, onChange }) => {
  const selectedValue = getProductBadgeOptionValue(product);

  return (
    <select
      value={selectedValue}
      onChange={(event) => onChange(product, event.target.value)}
      disabled={disabled}
      className={`${textInputClass} min-w-[170px] py-2.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {PRODUCT_BADGE_SELECT_OPTIONS.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

const FeaturedToggleButton = ({ product, disabled, limitReached, onToggle }) => (
  <button
    type="button"
    disabled={disabled || (!product.is_featured && limitReached)}
    onClick={() => onToggle(product)}
    title={!product.is_featured && limitReached ? `Đã đủ ${FEATURED_PRODUCT_LIMIT} sản phẩm nổi bật` : ''}
    className={`inline-flex items-center justify-center rounded-2xl px-4 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
      product.is_featured
        ? 'bg-sky-100 text-sky-800 ring-1 ring-sky-200 hover:bg-sky-200'
        : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-200'
    }`}
  >
    {product.is_featured ? 'Đang bật' : limitReached ? 'Đã đủ 5/5' : 'Đang tắt'}
  </button>
);

const InlineActionStatus = ({ active }) => {
  if (active) {
    return (
      <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Loader2 size={14} className="animate-spin" />
        Đang cập nhật...
      </span>
    );
  }

  return null;
};

const ProductsPanel = ({
  productSearch,
  setProductSearch,
  productCategoryFilter,
  setProductCategoryFilter,
  productStockFilter,
  setProductStockFilter,
  productViewMode,
  setProductViewMode,
  categoryDirectory,
  paginatedProducts,
  productPageSize,
  setProductPage,
  setProductPageSize,
  catalogLoading,
  featuredCount,
  productInlineLoadingId,
  openWarehouseCreateSection,
  openProductPreview,
  openEditProductModal,
  handleProductBadgeChange,
  handleProductFeaturedToggle,
}) => (
  <section className="space-y-6">
    <div className="sticky top-[4.5rem] z-20 rounded-[28px] border border-[color:var(--line-soft)] bg-[rgba(252,253,252,0.96)] p-4 shadow-[var(--shadow-soft)] backdrop-blur">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="w-full xl:max-w-[52%]">
          <h2 className="text-xl font-black text-slate-950">Danh mục sản phẩm</h2>
          <p className="mt-2 text-xs font-semibold text-slate-500">
            Đang chọn nổi bật: <span className="font-black text-slate-900">{featuredCount}</span> / {FEATURED_PRODUCT_LIMIT}
          </p>
        </div>

        <div className="grid w-full gap-3 xl:max-w-[780px] xl:grid-cols-[minmax(0,1.35fr)_180px_170px_auto_auto]">
          <label className="space-y-2 xl:col-span-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tìm kiếm</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                className={`${textInputClass} pl-10`}
                placeholder="Tìm tên sản phẩm..."
              />
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Danh mục</span>
            <select
              value={productCategoryFilter}
              onChange={(event) => setProductCategoryFilter(event.target.value)}
              className={textInputClass}
            >
              <option value="all">Tất cả danh mục</option>
              {categoryDirectory.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label || category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tồn kho</span>
            <select
              value={productStockFilter}
              onChange={(event) => setProductStockFilter(event.target.value)}
              className={textInputClass}
            >
              <option value="all">Tất cả</option>
              <option value="ok">Ổn định</option>
              <option value="low">Sắp hết</option>
              <option value="out">Hết hàng</option>
            </select>
          </label>

          <div className="flex items-end xl:justify-end">
            <SegmentedToggle
              value={productViewMode}
              options={PRODUCT_VIEW_MODES}
              onChange={setProductViewMode}
              size="compact"
            />
          </div>

          <button
            type="button"
            onClick={openWarehouseCreateSection}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(5,150,105,0.22)] transition hover:bg-emerald-700"
          >
            <PackagePlus size={16} />
            Thêm sản phẩm
          </button>
        </div>
      </div>
    </div>

    {!catalogLoading && paginatedProducts.total === 0 ? (
      <EmptyState
        title="Không có sản phẩm phù hợp"
        description="Thử đổi từ khóa tìm kiếm hoặc bộ lọc danh mục / tồn kho."
      />
    ) : null}

    {paginatedProducts.total > 0 && productViewMode === 'grid' ? (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {paginatedProducts.items.map((product) => {
          const qty = Number(product.stock ?? product.quantity ?? 0);
          const threshold = Number(product.low_stock_threshold ?? 5);
          const badge = getStockBadge(qty, threshold);
          const promotionLabel = getPromotionLabel(product);
          const categoryLabel = getCategoryLabel(product, categoryDirectory);
          const isUpdating = productInlineLoadingId === product.id;
          const limitReached = featuredCount >= FEATURED_PRODUCT_LIMIT;

          return (
            <article
              key={product.id}
              className={`group overflow-hidden rounded-[26px] border border-slate-200 ${getStockRowTint(qty, threshold)} shadow-[0_10px_28px_rgba(15,23,42,0.05)]`}
            >
              <button type="button" onClick={() => openProductPreview(product)} className="block w-full text-left">
                <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      <ImagePlus size={22} />
                    </div>
                  )}
                </div>
              </button>
              <div className="space-y-3 p-4">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    {categoryLabel}
                  </span>
                  {promotionLabel ? (
                    <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                      {promotionLabel}
                    </span>
                  ) : null}
                  {product.is_featured ? (
                    <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
                      Nổi bật
                    </span>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => openProductPreview(product)}
                  title={product.description || 'Chưa có mô tả'}
                  className={`line-clamp-2 text-left text-base font-black text-slate-950 ${breakAnywhereClass}`}
                >
                  {product.name}
                </button>

                <div className="flex items-end justify-between gap-3">
                  <PriceBlock product={product} />
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>

                <div className="space-y-2 rounded-[22px] border border-slate-200 bg-white/80 p-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Badge</span>
                    <BadgeSelect product={product} disabled={isUpdating} onChange={handleProductBadgeChange} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Nổi bật</p>
                      <p className="text-xs text-slate-500">Trang chủ tối đa {FEATURED_PRODUCT_LIMIT} sản phẩm</p>
                    </div>
                    <FeaturedToggleButton
                      product={product}
                      disabled={isUpdating}
                      limitReached={limitReached}
                      onToggle={handleProductFeaturedToggle}
                    />
                  </div>
                  <InlineActionStatus active={isUpdating} />
                </div>

                <button
                  type="button"
                  onClick={() => openEditProductModal(product)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white opacity-100 transition md:opacity-0 md:group-hover:opacity-100"
                >
                  <Edit3 size={14} />
                  Sửa thông tin
                </button>
              </div>
            </article>
          );
        })}
      </div>
    ) : null}

    {paginatedProducts.total > 0 && productViewMode === 'list' ? (
      <>
        <div className="grid gap-4 md:hidden">
          {paginatedProducts.items.map((product) => {
            const qty = Number(product.stock ?? product.quantity ?? 0);
            const threshold = Number(product.low_stock_threshold ?? 5);
            const badge = getStockBadge(qty, threshold);
            const promotionLabel = getPromotionLabel(product);
            const categoryLabel = getCategoryLabel(product, categoryDirectory);
            const isUpdating = productInlineLoadingId === product.id;
            const limitReached = featuredCount >= FEATURED_PRODUCT_LIMIT;

            return (
              <article
                key={product.id}
                className={`rounded-[26px] border border-slate-200 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)] ${getStockRowTint(qty, threshold)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-2xl bg-slate-100">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <ImagePlus size={16} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => openProductPreview(product)}
                      title={product.description || 'Chưa có mô tả'}
                      className={`line-clamp-2 text-left text-sm font-black text-slate-950 ${breakAnywhereClass}`}
                    >
                      {product.name}
                    </button>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                        {categoryLabel}
                      </span>
                      {promotionLabel ? (
                        <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                          {promotionLabel}
                        </span>
                      ) : null}
                      {product.is_featured ? (
                        <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
                          Nổi bật
                        </span>
                      ) : null}
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <PriceBlock product={product} />
                  <StockLevel qty={qty} threshold={threshold} />
                </div>

                <div className="mt-4 space-y-3 rounded-[22px] border border-slate-200 bg-white/80 p-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Badge</span>
                    <BadgeSelect product={product} disabled={isUpdating} onChange={handleProductBadgeChange} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-700">Sản phẩm nổi bật</span>
                    <FeaturedToggleButton
                      product={product}
                      disabled={isUpdating}
                      limitReached={limitReached}
                      onToggle={handleProductFeaturedToggle}
                    />
                  </div>
                  <InlineActionStatus active={isUpdating} />
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openProductPreview(product)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
                  >
                    <Eye size={14} />
                    Xem
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditProductModal(product)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <Edit3 size={14} />
                    Sửa thông tin
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="hidden overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[var(--shadow-soft)] md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1220px]">
              <thead className="bg-slate-50/90 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-5 py-4">Ảnh</th>
                  <th className="px-5 py-4">Tên sản phẩm</th>
                  <th className="px-5 py-4">Danh mục</th>
                  <th className="px-5 py-4">Badge</th>
                  <th className="px-5 py-4">Nổi bật</th>
                  <th className="px-5 py-4 text-right">Giá bán</th>
                  <th className="px-5 py-4">Tồn kho</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedProducts.items.map((product) => {
                  const qty = Number(product.stock ?? product.quantity ?? 0);
                  const threshold = Number(product.low_stock_threshold ?? 5);
                  const badge = getStockBadge(qty, threshold);
                  const isUpdating = productInlineLoadingId === product.id;
                  const promotionLabel = getPromotionLabel(product);
                  const limitReached = featuredCount >= FEATURED_PRODUCT_LIMIT;

                  return (
                    <tr key={product.id} className={`transition hover:bg-slate-50/70 ${getStockRowTint(qty, threshold)}`}>
                      <td className="px-5 py-4 align-middle">
                        <div className="h-12 w-12 overflow-hidden rounded-[14px] bg-slate-100">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-400">
                              <ImagePlus size={16} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <button
                          type="button"
                          onClick={() => openProductPreview(product)}
                          title={product.description || 'Chưa có mô tả'}
                          className={`line-clamp-2 max-w-[320px] text-left text-sm font-black leading-6 text-slate-950 hover:text-emerald-700 ${breakAnywhereClass}`}
                        >
                          {product.name}
                        </button>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {getCategoryLabel(product, categoryDirectory)}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <div className="space-y-2">
                          {promotionLabel ? (
                            <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                              {promotionLabel}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400">Không có</span>
                          )}
                          <BadgeSelect product={product} disabled={isUpdating} onChange={handleProductBadgeChange} />
                        </div>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <div className="space-y-2">
                          <FeaturedToggleButton
                            product={product}
                            disabled={isUpdating}
                            limitReached={limitReached}
                            onToggle={handleProductFeaturedToggle}
                          />
                          <InlineActionStatus active={isUpdating} />
                        </div>
                      </td>
                      <td className="px-5 py-4 align-middle text-right">
                        <PriceBlock product={product} align="right" />
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <div className="space-y-1.5">
                          <StockLevel qty={qty} threshold={threshold} />
                          <p className="text-xs text-slate-500">Ngưỡng cảnh báo: {formatCompactNumber(threshold)}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openProductPreview(product)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                          >
                            <Eye size={14} />
                            Xem
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditProductModal(product)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                          >
                            <Edit3 size={14} />
                            Sửa thông tin
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </>
    ) : null}

    {paginatedProducts.total > 0 ? (
      <NumericPaginationBar
        page={paginatedProducts.page}
        totalPages={paginatedProducts.totalPages}
        total={paginatedProducts.total}
        pageSize={productPageSize}
        onPageChange={setProductPage}
        onPageSizeChange={setProductPageSize}
      />
    ) : null}
  </section>
);

export default ProductsPanel;
