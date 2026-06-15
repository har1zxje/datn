import React, { useMemo, useState } from 'react';
import { ChevronDown, Package } from 'lucide-react';
import { FALLBACK_CATEGORY_SYSTEM } from '../../data/categorySystem';
import { useAppSettings } from '../../context/AppSettingsContext';
import { safeText } from '../../utils/text';

const MarketCategorySidebar = ({
  activeCategoryId = '',
  onSelectCategory,
  onSelectKeyword,
  categories = [],
  compact = false,
  sticky = true,
  className = '',
}) => {
  const { language } = useAppSettings();
  const [expandedCategoryId, setExpandedCategoryId] = useState('');

  const categoryItems = useMemo(() => {
    const source = Array.isArray(categories) && categories.length > 0 ? categories : FALLBACK_CATEGORY_SYSTEM;

    return source.map((category) => ({
      ...category,
      id: String(category.id),
      displayLabel:
        language === 'en'
          ? safeText(category.labelEn || category.label || category.name)
          : safeText(category.label || category.name),
      displayChildren:
        language === 'en'
          ? category.childrenEn || category.children || category.subCategories || []
          : category.children || category.subCategories || [],
      emoji: safeText(category.icon, '🛒'),
    }));
  }, [categories, language]);

  if (compact) {
    return (
      <div className="market-scrollbar flex gap-3 overflow-x-auto pb-4 lg:hidden">
        <button
          type="button"
          onClick={() => onSelectCategory?.(null)}
          className={`font-category-label shrink-0 rounded-full border px-5 py-3 text-sm font-semibold shadow-sm transition-all duration-300 ${
            !activeCategoryId
              ? 'border-emerald-600 bg-emerald-600 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          Tất cả
        </button>
        {categoryItems.map((category) => {
          const isActive = activeCategoryId === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelectCategory?.(category)}
              className={`font-category-label flex shrink-0 items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold shadow-sm transition-all duration-300 ${
                isActive
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              <span className="text-base leading-none">{category.emoji}</span>
              {category.displayLabel}
            </button>
          );
        })}
      </div>
    );
  }

  const sidebarClassName = [
    'market-category-sidebar hidden h-fit self-start max-h-[calc(100vh-3rem)] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.08)] lg:block',
    sticky ? 'sticky top-6' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <aside className={sidebarClassName}>
      <div className="flex items-center gap-2 border-b border-slate-200 bg-emerald-600 px-6 py-5 text-white">
        <Package size={20} />
        <h2 className="font-category-label text-base font-bold">Danh mục sản phẩm</h2>
      </div>

      <nav className="divide-y divide-slate-100" aria-label="Danh mục sản phẩm">
        <button
          type="button"
          onClick={() => {
            setExpandedCategoryId('');
            onSelectCategory?.(null);
          }}
          className={`font-category-label flex w-full items-center justify-between px-6 py-4 text-left text-sm font-bold transition-all duration-300 ${
            !activeCategoryId ? 'bg-emerald-50 text-emerald-700' : 'text-slate-800 hover:bg-slate-50'
          }`}
        >
          Tất cả sản phẩm
          <ChevronDown size={16} className="text-slate-400" />
        </button>

        {categoryItems.map((category) => {
          const isActive = activeCategoryId === category.id;
          const isExpanded = expandedCategoryId === category.id;

          return (
            <div key={category.id} className={`market-category-group ${isActive ? 'market-category-group--active bg-emerald-50/70' : 'bg-white'}`}>
              <button
                type="button"
                onClick={() => {
                  onSelectCategory?.(category);
                  setExpandedCategoryId((prev) => (prev === category.id ? '' : category.id));
                }}
                className={`flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition-all duration-300 ${
                  isActive ? 'text-emerald-700' : 'text-slate-800 hover:bg-slate-50'
                }`}
              >
                <span className="flex min-w-0 items-center gap-3 ps-0.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-lg">
                    {category.emoji}
                  </span>
                  <span className="font-category-label truncate text-sm font-bold">{category.displayLabel}</span>
                </span>
                <ChevronDown size={15} className={`shrink-0 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isExpanded && (
                <div className="market-category-children space-y-1.5 pb-5 ps-[4.25rem] pe-6">
                  {category.displayChildren.map((child, idx) => (
                    <button
                      key={`${category.id}-${idx}`}
                      type="button"
                      onClick={() => onSelectKeyword?.(child, category)}
                      className="market-category-child font-category-label block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition-all duration-300 hover:bg-white hover:text-emerald-700"
                    >
                      {safeText(child)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
};

export default MarketCategorySidebar;

