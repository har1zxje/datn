import React from 'react';
import {
  Baby,
  Beef,
  Carrot,
  ChevronDown,
  Cookie,
  Fish,
  Milk,
  Package,
  Snowflake,
  Sparkles,
  SprayCan,
  Wheat,
} from 'lucide-react';
import { marketCategories } from '../../data/marketNavigation';

const iconMap = {
  baby: Baby,
  beef: Beef,
  carrot: Carrot,
  cookie: Cookie,
  fish: Fish,
  milk: Milk,
  package: Package,
  snowflake: Snowflake,
  sparkles: Sparkles,
  spray: SprayCan,
  wheat: Wheat,
};

const MarketCategorySidebar = ({
  activeCategoryId = '',
  onSelectCategory,
  onSelectKeyword,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className="market-scrollbar flex gap-2 overflow-x-auto pb-3 lg:hidden">
        <button
          type="button"
          onClick={() => onSelectCategory?.(null)}
          className={`shrink-0 rounded-full border px-4 py-3 text-sm font-semibold transition-all duration-300 ${
            !activeCategoryId
              ? 'border-emerald-600 bg-emerald-600 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200'
          }`}
        >
          Tat ca
        </button>
        {marketCategories.map((category) => {
          const Icon = iconMap[category.icon] || Package;
          const isActive = activeCategoryId === category.id;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelectCategory?.(category)}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition-all duration-300 ${
                isActive
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200'
              }`}
            >
              <Icon size={16} />
              {category.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <aside className="sticky top-36 hidden max-h-[calc(100vh-10rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-emerald-600 px-5 py-4 text-white">
        <Package size={20} />
        <h2 className="text-base font-bold">Danh muc san pham</h2>
      </div>

      <nav className="divide-y divide-slate-100" aria-label="Danh muc san pham">
        <button
          type="button"
          onClick={() => onSelectCategory?.(null)}
          className={`flex w-full items-center justify-between px-5 py-4 text-left text-sm font-bold transition-all duration-300 ${
            !activeCategoryId ? 'bg-emerald-50 text-emerald-700' : 'text-slate-800 hover:bg-slate-50'
          }`}
        >
          Tat ca san pham
          <ChevronDown size={16} className="text-slate-400" />
        </button>

        {marketCategories.map((category) => {
          const Icon = iconMap[category.icon] || Package;
          const isActive = activeCategoryId === category.id;

          return (
            <div key={category.id} className={isActive ? 'bg-emerald-50/70' : 'bg-white'}>
              <button
                type="button"
                onClick={() => onSelectCategory?.(category)}
                className={`flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-all duration-300 ${
                  isActive ? 'text-emerald-700' : 'text-slate-800 hover:bg-slate-50'
                }`}
              >
                <span className="flex min-w-0 items-center gap-3 ps-1">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <Icon size={18} />
                  </span>
                  <span className="truncate text-sm font-bold">{category.label}</span>
                </span>
                <ChevronDown size={15} className="shrink-0 text-slate-400" />
              </button>

              <div className="space-y-1 pb-4 ps-16 pe-5">
                {category.children.map((child) => (
                  <button
                    key={child}
                    type="button"
                    onClick={() => onSelectKeyword?.(child, category)}
                    className="block w-full rounded-md px-2 py-2 text-left text-sm font-medium text-slate-600 transition-all duration-300 hover:bg-white hover:text-emerald-700"
                  >
                    {child}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
};

export default MarketCategorySidebar;
