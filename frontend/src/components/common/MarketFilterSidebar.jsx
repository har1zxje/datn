import React, { useMemo } from 'react';
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { safeText } from '../../utils/text';

const formatNumber = (value) => Number(value || 0).toLocaleString('vi-VN');

const MarketFilterSidebar = ({
  searchQuery = '',
  activeCategoryId = '',
  minPrice = '',
  maxPrice = '',
  matchingCount = 0,
  categories = [],
  language = 'vi',
  sticky = true,
  className = '',
  onSearchChange,
  onSelectCategory,
  onMinPriceChange,
  onMaxPriceChange,
  onClearFilters,
}) => {
  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        id: String(category.id),
        label:
          language === 'en'
            ? safeText(category.labelEn || category.label || category.name, 'Category')
            : safeText(category.backendName || category.label || category.name, 'Danh mục'),
      })),
    [categories, language]
  );

  const hasActiveFilters = Boolean(searchQuery || activeCategoryId || minPrice || maxPrice);
  const selectedCategoryLabel =
    categoryOptions.find((category) => category.id === String(activeCategoryId))?.label || '';

  const wrapperClassName = [
    'rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.08)] md:p-6',
    sticky ? 'sticky top-6' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={wrapperClassName}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">
            <SlidersHorizontal size={14} />
            {language === 'en' ? 'Filters' : 'Bộ lọc'}
          </div>
          <h2 className="mt-3 text-2xl font-black text-slate-950">
            {language === 'en' ? 'Find products faster' : 'Tìm nhanh hơn'}
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            {language === 'en'
              ? 'Search by name, category, and price.'
              : 'Lọc theo tên, danh mục và giá.'}
          </p>
        </div>

        <div className="shrink-0 rounded-[24px] bg-[linear-gradient(180deg,#0f9f6e,#0b7f59)] px-5 py-4 text-white shadow-[0_18px_34px_rgba(5,150,105,0.28)]">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100">
            {language === 'en' ? 'Matching' : 'Phù hợp'}
          </p>
          <p className="mt-1 text-3xl font-black leading-none">{formatNumber(matchingCount)}</p>
          <p className="mt-1 text-xs font-semibold text-emerald-50">
            {language === 'en' ? 'products' : 'sản phẩm'}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor="shop-filter-name" className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
            {language === 'en' ? 'Product name' : 'Tên sản phẩm'}
          </label>
          <div className="flex h-14 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-100">
            <Search size={18} className="shrink-0 text-slate-400" />
            <input
              id="shop-filter-name"
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder={language === 'en' ? 'Search product name' : 'Nhập tên sản phẩm'}
              className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div>
          <label htmlFor="shop-filter-category" className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
            {language === 'en' ? 'Category' : 'Danh mục'}
          </label>
          <select
            id="shop-filter-category"
            value={activeCategoryId}
            onChange={(event) => {
              const nextCategory =
                categories.find((category) => String(category.id) === event.target.value) || null;
              onSelectCategory?.(nextCategory);
            }}
            className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
          >
            <option value="">{language === 'en' ? 'All categories' : 'Tất cả danh mục'}</option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="shop-filter-min-price" className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
              {language === 'en' ? 'Min price' : 'Giá từ'}
            </label>
            <input
              id="shop-filter-min-price"
              type="text"
              inputMode="numeric"
              value={minPrice}
              onChange={(event) => onMinPriceChange?.(event.target.value)}
              placeholder="0"
              className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label htmlFor="shop-filter-max-price" className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
              {language === 'en' ? 'Max price' : 'Giá đến'}
            </label>
            <input
              id="shop-filter-max-price"
              type="text"
              inputMode="numeric"
              value={maxPrice}
              onChange={(event) => onMaxPriceChange?.(event.target.value)}
              placeholder="500000"
              className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            />
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-5 flex flex-wrap gap-2">
          {searchQuery && (
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
              {language === 'en' ? 'Name' : 'Tên'}: {safeText(searchQuery)}
            </span>
          )}
          {selectedCategoryLabel && (
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
              {language === 'en' ? 'Category' : 'Danh mục'}: {selectedCategoryLabel}
            </span>
          )}
          {(minPrice || maxPrice) && (
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
              {language === 'en' ? 'Price' : 'Giá'}: {minPrice ? formatNumber(minPrice) : '0'} -{' '}
              {maxPrice ? formatNumber(maxPrice) : '...'}
            </span>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => onClearFilters?.()}
        disabled={!hasActiveFilters}
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RotateCcw size={16} />
        {language === 'en' ? 'Clear filters' : 'Xóa bộ lọc'}
      </button>
    </section>
  );
};

export default MarketFilterSidebar;
