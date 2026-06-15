import React, { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronLeft, ChevronRight, House, LogOut, Menu, RefreshCcw, ShieldCheck, X } from 'lucide-react';

const baseTabButton =
  'group relative flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left text-sm font-semibold transition-all';

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
  notificationCount = 0,
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

  const roleLabel = user?.role === 'staff' ? 'Nhân viên' : 'Quản trị viên';
  const userName = user?.full_name || user?.username || 'Admin';
  const userInitial = userName.trim().charAt(0).toUpperCase();

  const handleSelectTab = (nextTab) => {
    onTabChange(nextTab);
    setMobileOpen(false);
  };

  const renderSidebarContent = (compact) => (
    <div className="flex h-full flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div className={`flex items-center gap-3 ${compact ? 'lg:justify-center' : ''}`}>
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm shadow-emerald-200">
            <ShieldCheck size={20} />
          </span>
          {!compact && (
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-700">FreshFood AI</p>
              <p className="text-xs font-medium text-slate-500">Khu vực quản trị</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleCollapsed}
          className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 lg:inline-flex"
          aria-label={collapsed ? 'Mở rộng thanh bên quản trị' : 'Thu gọn thanh bên quản trị'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 space-y-1.5" aria-label="Điều hướng quản trị">
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
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950'
              } ${compact ? 'lg:justify-center lg:px-0' : ''}`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                  selected ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200' : 'bg-slate-100 text-slate-500'
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

      <div className={`rounded-[24px] border border-slate-200 bg-slate-50 p-4 ${compact ? 'lg:px-3' : ''}`}>
        <div className={`flex items-center gap-3 ${compact ? 'lg:justify-center' : ''}`}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white">
            {userInitial}
          </span>
          {!compact && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-950">{userName}</p>
              <p className="truncate text-xs text-slate-500">{roleLabel}</p>
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
            {!compact && <span>Trang chủ</span>}
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
            {!compact && <span>Đăng xuất</span>}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[oklch(0.985_0.008_150)]">
      <div className="flex min-h-screen">
        <aside
          className={`sticky top-0 hidden h-screen shrink-0 border-r border-slate-200/80 bg-[rgba(252,253,252,0.96)] px-4 py-5 backdrop-blur lg:block ${
            collapsed ? 'w-24' : 'w-[278px]'
          }`}
        >
          {renderSidebarContent(collapsed)}
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-[90] lg:hidden">
            <button
              type="button"
              aria-label="Đóng điều hướng quản trị"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            <aside className="absolute inset-y-0 left-0 flex w-[min(310px,88vw)] flex-col border-r border-slate-200 bg-white px-4 py-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500"
                  aria-label="Đóng điều hướng quản trị"
                >
                  <X size={18} />
                </button>
              </div>
              {renderSidebarContent(false)}
            </aside>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 h-14 border-b border-slate-200/85 bg-[rgba(252,253,252,0.94)] px-4 backdrop-blur md:px-6 lg:px-8">
            <div className="flex h-full items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3" title={`${title}. ${subtitle}`}>
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 lg:hidden"
                  aria-label="Mở điều hướng quản trị"
                >
                  <Menu size={18} />
                </button>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Admin / <span className="text-slate-700">{activeTabMeta?.label || title}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onRefresh}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 md:px-4"
                >
                  <RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} />
                  <span className="hidden sm:inline">Làm mới</span>
                </button>

                <button
                  type="button"
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                  aria-label="Thông báo"
                >
                  <Bell size={16} />
                  {notificationCount > 0 ? (
                    <span className="absolute right-1.5 top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-black leading-4 text-white">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  ) : null}
                </button>

                <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-2.5 py-1.5 md:flex">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-xs font-black text-white">
                    {userInitial}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{userName}</p>
                    <p className="truncate text-[11px] text-slate-500">{roleLabel}</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="px-4 py-5 md:px-6 md:py-6 lg:px-8 lg:py-7">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default AdminShell;
