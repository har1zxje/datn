import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, House, LogOut, Menu, RefreshCcw, ShieldCheck, X } from 'lucide-react';

const baseTabButton =
  'group relative flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition-all';

const AdminShell = ({
  user,
  tabs,
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapsed,
  title,
  subtitle,
  refreshing,
  onRefresh,
  onGoHome,
  onLogout,
  children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const activeTabMeta = useMemo(
    () => tabs.find((item) => item.key === activeTab) || tabs[0],
    [activeTab, tabs],
  );

  const handleSelectTab = (nextTab) => {
    onTabChange(nextTab);
    setMobileOpen(false);
  };

  const renderSidebarContent = (compact) => (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className={`flex items-center gap-3 ${compact ? 'lg:justify-center' : ''}`}>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm shadow-emerald-200">
            <ShieldCheck size={22} />
          </span>
          {!compact && (
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">FreshFood AI</p>
              <p className="text-xs font-semibold text-slate-500">Admin workspace</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleCollapsed}
          className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 lg:inline-flex"
          aria-label={collapsed ? 'Expand admin sidebar' : 'Collapse admin sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 space-y-2" aria-label="Admin navigation">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              title={tab.label}
              onClick={() => handleSelectTab(tab.key)}
              className={`${baseTabButton} ${
                selected
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm'
                  : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950'
              } ${compact ? 'lg:justify-center lg:px-0' : ''}`}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                  selected ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200' : 'bg-white text-slate-500'
                }`}
              >
                <Icon size={18} />
              </span>
              {!compact && (
                <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <span className="truncate">{tab.label}</span>
                  {tab.badge ? (
                    <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-slate-900 px-2 py-1 text-[11px] font-black text-white">
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </span>
                  ) : null}
                </span>
              )}
              {compact && tab.badge ? (
                <span className="absolute right-2 top-2 hidden h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-black text-white lg:inline-flex">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className={`rounded-3xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm ${compact ? 'lg:px-3' : ''}`}>
        <div className={`flex items-center gap-3 ${compact ? 'lg:justify-center' : ''}`}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white">
            {(user?.full_name || user?.username || 'A').trim().charAt(0).toUpperCase()}
          </span>
          {!compact && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-950">{user?.full_name || user?.username || 'Admin'}</p>
              <p className="truncate text-xs text-slate-500">{user?.role === 'staff' ? 'Nhan vien' : 'Quan tri vien'}</p>
            </div>
          )}
        </div>

        <div className={`mt-4 grid gap-2 ${compact ? 'lg:grid-cols-1' : 'grid-cols-2'}`}>
          <button
            type="button"
            onClick={onGoHome}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 ${
              compact ? 'lg:px-0' : ''
            }`}
            aria-label="Quay lại trang chủ"
            title="Quay lại trang chủ"
          >
            <House size={16} />
            {!compact && <span>Trang chu</span>}
          </button>

          <button
            type="button"
            onClick={onLogout}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-3 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 ${
              compact ? 'lg:px-0' : ''
            }`}
            aria-label="Đăng xuất"
            title="Đăng xuất"
          >
            <LogOut size={16} />
            {!compact && <span>Dang xuat</span>}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-transparent">
      <div className="flex min-h-screen">
        <aside
          className={`sticky top-0 hidden h-screen shrink-0 border-r border-slate-200/80 bg-white/92 px-4 py-5 shadow-[18px_0_45px_rgba(15,23,42,0.05)] backdrop-blur lg:block ${
            collapsed ? 'w-24' : 'w-[292px]'
          }`}
        >
          {renderSidebarContent(collapsed)}
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-[90] lg:hidden">
            <button
              type="button"
              aria-label="Close admin navigation"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            />
            <aside className="absolute inset-y-0 left-0 flex w-[min(310px,88vw)] flex-col border-r border-slate-200 bg-white px-4 py-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500"
                  aria-label="Close admin navigation"
                >
                  <X size={18} />
                </button>
              </div>
              {renderSidebarContent(false)}
            </aside>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/88 px-4 py-4 backdrop-blur md:px-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 lg:hidden"
                  aria-label="Open admin navigation"
                >
                  <Menu size={18} />
                </button>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                    {activeTabMeta?.label || 'Admin'}
                  </p>
                  <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:text-[2rem]">
                    {title}
                  </h1>
                  <p className="mt-1 max-w-3xl text-sm text-slate-500">{subtitle}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} />
                Lam moi
              </button>
            </div>
          </header>

          <main className="px-4 py-5 md:px-6 md:py-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default AdminShell;
