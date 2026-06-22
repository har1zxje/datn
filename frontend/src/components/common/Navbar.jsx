import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  Contrast,
  Heart,
  Languages,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  ShoppingCart,
  UserRound,
  X,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useAppSettings } from '../../context/AppSettingsContext';
import { getNotifications, markNotificationRead } from '../../services/api';
import { safeText } from '../../utils/text';
import AuthModal from './AuthModal';

const BrandMark = ({ size = 'md' }) => {
  const dim = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const iconDim = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <span className={`flex ${dim} items-center justify-center rounded-[1.1rem] bg-emerald-600 text-white shadow-[0_12px_24px_rgba(15,154,98,0.28)]`}>
      <svg viewBox="0 0 24 24" className={iconDim} fill="none" aria-hidden="true">
        <path d="M4.2 12a7.8 7.8 0 1 1 3.2 6.3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        <path d="M11.9 16.2V9.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        <path d="M11.9 9.6c1.8 0 3.2 1.4 3.2 3.2-1.8 0-3.2-1.4-3.2-3.2Z" stroke="currentColor" strokeWidth="1.9" />
        <path d="M11.9 10.5c-1.5 0-2.8 1.2-2.8 2.8 1.5 0 2.8-1.2 2.8-2.8Z" stroke="currentColor" strokeWidth="1.9" />
      </svg>
    </span>
  );
};

const Navbar = () => {
  const { cartCount, canUseCart } = useCart();
  const { favoritesCount } = useFavorites();
  const { user, logout } = useAuth();
  const { language, setLanguage, theme, toggleTheme, t } = useAppSettings();
  const location = useLocation();
  const navigate = useNavigate();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const userMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);
  const canAccessCart = canUseCart;
  const unreadNotifications = notifications.filter((item) => !item.is_read).length;

  const displayName = safeText(user?.full_name || user?.username, language === 'en' ? 'Customer' : 'Khách hàng');
  const userInitial = displayName.charAt(0).toUpperCase();
  const avatarUrl = user?.avatar_url || null;
  const isActive = (path) => location.pathname === path;

  const goSearch = (value) => {
    const keyword = String(value || '').trim();
    navigate(keyword ? `/shop?q=${encodeURIComponent(keyword)}` : '/shop');
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    goSearch(searchTerm);
  };

  const handleProtectedAction = (event) => {
    if (!user) {
      event.preventDefault();
      setIsModalOpen(true);
    }
  };

  const handleLogout = () => {
    setShowUserMenu(false);
    setShowNotificationMenu(false);
    setShowMobileMenu(false);
    setNotifications([]);
    logout();
    navigate('/');
  };

  const loadNotifications = async () => {
    if (!user) return;
    try {
      setLoadingNotifications(true);
      const data = await getNotifications({ limit: 8 });
      setNotifications(data);
    } catch {
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleNotificationToggle = async () => {
    if (!user) {
      setIsModalOpen(true);
      return;
    }
    if (!showNotificationMenu) {
      await loadNotifications();
    }
    setShowNotificationMenu((prev) => !prev);
    setShowUserMenu(false);
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.is_read) {
        const updated = await markNotificationRead(notification.id);
        setNotifications((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      }
    } catch {
      // Khong block dieu huong neu cap nhat read that bai.
    }

    setShowNotificationMenu(false);
    setShowMobileMenu(false);

    if (notification.notification_type === 'freshness_confirmation' && notification.order_id) {
      navigate(`/orders/${notification.order_id}/confirm-freshness`);
      return;
    }

    navigate('/profile', { state: { tab: 'orders' } });
  };

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (showUserMenu && !userMenuRef.current?.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (showNotificationMenu && !notificationMenuRef.current?.contains(event.target)) {
        setShowNotificationMenu(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowUserMenu(false);
        setShowNotificationMenu(false);
        setShowMobileMenu(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showNotificationMenu, showUserMenu]);

  useEffect(() => {
    document.body.style.overflow = showMobileMenu ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showMobileMenu]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setShowNotificationMenu(false);
      return;
    }
    loadNotifications();
  }, [user]);

  return (
    <>
      <nav className="navbar fresh-market-header" role="navigation" aria-label="Điều hướng chính">
        <div className="fresh-container flex flex-col gap-3 py-3 md:gap-3 md:py-4">

          {/* Row 1: Logo + Search (desktop) + Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            <Link
              to="/"
              className="flex shrink-0 items-center gap-3 rounded-2xl px-1 py-1 text-slate-950 outline-none transition-all duration-300 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-300"
              aria-label="NutriGro - Trang chủ"
            >
              <BrandMark />
              <span className="leading-tight">
                <span className="block text-base font-black tracking-tight md:text-lg">NutriGro</span>
                <span className="hidden text-xs font-semibold text-emerald-100 sm:block">Mua tươi, kiểm tra rõ</span>
              </span>
            </Link>

            {/* Search — desktop only */}
            <form onSubmit={handleSearchSubmit} className="relative hidden min-w-0 flex-1 md:block">
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('nav_search_placeholder')}
                className="h-12 w-full rounded-full border border-slate-200/90 bg-white/96 py-2 pl-5 pr-11 text-sm font-semibold text-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.06)] outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-emerald-700 transition hover:bg-emerald-50"
                aria-label={language === 'en' ? 'Search' : 'Tìm kiếm'}
              >
                <Search size={17} />
              </button>
            </form>

            {/* Actions */}
            <div className="ml-auto flex shrink-0 items-center gap-1.5 md:gap-2">
              {/* Favorites */}
              <Link
                to="/favorites"
                className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-[0_8px_22px_rgba(15,23,42,0.06)] transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                title={t('nav_favorites')}
                aria-label={t('nav_favorites')}
              >
                <Heart size={18} />
                {favoritesCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white">
                    {favoritesCount}
                  </span>
                )}
              </Link>

              {/* Cart */}
              {canAccessCart && (
                <Link
                  to="/cart"
                  onClick={handleProtectedAction}
                  className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-[0_8px_22px_rgba(15,23,42,0.06)] transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                  title={t('nav_cart')}
                  aria-label={t('nav_cart')}
                >
                  <ShoppingCart size={19} />
                  {cartCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white">
                      {cartCount}
                    </span>
                  )}
                </Link>
              )}

              {user && (
                <div className="relative" ref={notificationMenuRef}>
                  <button
                    type="button"
                    onClick={handleNotificationToggle}
                    className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-[0_8px_22px_rgba(15,23,42,0.06)] transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                    aria-label="Thông báo xác nhận độ tươi"
                    aria-expanded={showNotificationMenu}
                  >
                    <Bell size={18} />
                    {unreadNotifications > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white">
                        {unreadNotifications}
                      </span>
                    )}
                  </button>

                  {showNotificationMenu && (
                    <div className="absolute right-0 z-20 mt-2 w-[min(24rem,90vw)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                      <div className="border-b border-slate-100 bg-emerald-50 px-4 py-3">
                        <p className="font-bold text-slate-900">Thông báo</p>
                        <p className="text-xs text-slate-500">Các việc cần xử lý</p>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {loadingNotifications ? (
                          <div className="px-4 py-6 text-sm font-semibold text-slate-500">Đang tải thông báo...</div>
                        ) : notifications.length === 0 ? (
                          <div className="px-4 py-6 text-sm text-slate-500">Chưa có thông báo mới.</div>
                        ) : (
                          notifications.map((notification) => (
                            <button
                              key={notification.id}
                              type="button"
                              onClick={() => handleNotificationClick(notification)}
                              className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50 ${
                                notification.is_read ? 'bg-white' : 'bg-amber-50/40'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-bold text-slate-900">{notification.title}</p>
                                  <p className="mt-1 text-xs leading-5 text-slate-600">{notification.message}</p>
                                </div>
                                {!notification.is_read && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-rose-500" />}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* User menu — desktop */}
              {user ? (
                <div className="relative hidden md:block" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowUserMenu((v) => !v)}
                    className="flex h-11 items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-2 pe-3 text-sm font-bold text-slate-900 shadow-[0_8px_22px_rgba(15,23,42,0.06)] transition-all hover:border-emerald-200 hover:bg-emerald-50"
                    aria-expanded={showUserMenu}
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName} className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                        {userInitial}
                      </span>
                    )}
                    <span className="hidden max-w-24 truncate sm:inline">{displayName}</span>
                    <ChevronDown size={14} className="text-slate-500" />
                  </button>

                  {showUserMenu && (
                    <div className="absolute end-0 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                      <div className="border-b border-slate-100 bg-emerald-50 px-4 py-3">
                        <p className="font-bold text-slate-900">{displayName}</p>
                        <p className="truncate text-sm text-slate-600">{safeText(user?.email || user?.username)}</p>
                        {user?.is_admin && (
                          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-1 text-xs font-bold text-sky-700">
                            <ShieldCheck size={12} />
                            Admin
                          </span>
                        )}
                        {user?.role === 'staff' && (
                          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">
                            <ShieldCheck size={12} />
                            Nhân viên
                          </span>
                        )}
                      </div>

                      <div className="py-1">
                        <Link
                          to="/profile"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <UserRound size={16} />
                          {t('nav_account')}
                        </Link>

                        {/* Đổi giao diện */}
                        <button
                          type="button"
                          onClick={toggleTheme}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <Contrast size={16} />
                          <span className="flex-1 text-left">{t('nav_settings_theme')}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                            {theme === 'mono' ? t('nav_settings_theme_color') : t('nav_settings_theme_mono')}
                          </span>
                        </button>

                        {/* Ngôn ngữ */}
                        <div className="flex items-center gap-3 px-4 py-2.5">
                          <Languages size={16} className="shrink-0 text-slate-500" />
                          <span className="flex-1 text-sm font-semibold text-slate-700">{t('nav_settings_language')}</span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => setLanguage('vi')}
                              className={`rounded-full px-2.5 py-0.5 text-xs font-bold transition ${
                                language === 'vi' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              VI
                            </button>
                            <button
                              type="button"
                              onClick={() => setLanguage('en')}
                              className={`rounded-full px-2.5 py-0.5 text-xs font-bold transition ${
                                language === 'en' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              EN
                            </button>
                          </div>
                        </div>

                        {(user?.is_admin || user?.role === 'staff') && (
                          <Link
                            to="/admin/dashboard"
                            onClick={() => setShowUserMenu(false)}
                            className={`flex items-center gap-3 border-t border-slate-100 px-4 py-2.5 text-sm font-semibold transition ${
                              user?.is_admin
                                ? 'text-sky-700 hover:bg-sky-50'
                                : 'text-blue-700 hover:bg-blue-50'
                            }`}
                          >
                            <ShieldCheck size={16} />
                            {user?.is_admin ? 'Dashboard' : 'Quản lý'}
                          </Link>
                        )}

                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-2.5 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                        >
                          <LogOut size={16} />
                          {t('nav_logout')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="hidden h-11 items-center rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(15,154,98,0.22)] transition-all hover:bg-emerald-700 md:inline-flex"
                >
                  {t('nav_login')}
                </Link>
              )}

              {/* Hamburger — mobile only */}
              <button
                type="button"
                onClick={() => setShowMobileMenu(true)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 md:hidden"
                aria-label="Mở menu"
              >
                <Menu size={20} />
              </button>
            </div>
          </div>

          {/* Row 2: Mobile search */}
          <form onSubmit={handleSearchSubmit} className="relative md:hidden">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('nav_search_mobile_placeholder')}
            className="h-11 w-full rounded-full border border-slate-200/90 bg-white/96 py-2 pl-4 pr-11 text-sm font-semibold text-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.06)] outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-emerald-700 transition hover:bg-emerald-50"
              aria-label={language === 'en' ? 'Search' : 'Tìm kiếm'}
            >
              <Search size={16} />
            </button>
          </form>

          {/* Row 3: Nav links — hidden on mobile (mobile uses drawer) */}
          <div className="hidden items-center gap-2 sm:flex">
            <Link
              to="/"
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                isActive('/') ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              {t('nav_home')}
            </Link>
            <Link
              to="/shop"
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                isActive('/shop') ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              {t('nav_shop')}
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-[70] md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowMobileMenu(false)}
            aria-hidden="true"
          />
          <div className="absolute bottom-0 left-0 top-0 flex w-[min(300px,85vw)] flex-col bg-white shadow-2xl">
            {/* Drawer header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-emerald-50 px-5 py-4">
              <Link to="/" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-2">
                <BrandMark size="sm" />
                <span className="font-black text-emerald-900">NutriGro</span>
              </Link>
              <button
                type="button"
                onClick={() => setShowMobileMenu(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200"
                aria-label="Đóng menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* User info */}
            {user && (
              <div className="border-b border-slate-100 px-5 py-3">
                <div className="flex items-center gap-3">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="h-9 w-9 rounded-full object-cover ring-2 ring-emerald-200" />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                      {userInitial}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{displayName}</p>
                    <p className="truncate text-xs text-slate-500">{safeText(user?.email || user?.username)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto py-2">
              {[
                { to: '/', label: t('nav_home') },
                { to: '/shop', label: t('nav_shop') },
              ].map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setShowMobileMenu(false)}
                  className={`flex items-center px-5 py-3 text-sm font-semibold transition ${
                    isActive(to) ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </Link>
              ))}
              <Link
                to="/favorites"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Heart size={15} className="text-emerald-600" />
                {t('nav_favorites')}
                {favoritesCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-600">
                    {favoritesCount}
                  </span>
                )}
              </Link>
              {canAccessCart && (
                <Link
                  to="/cart"
                  onClick={(e) => { handleProtectedAction(e); if (user) setShowMobileMenu(false); }}
                  className="flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <ShoppingCart size={15} className="text-emerald-600" />
                  {t('nav_cart')}
                  {cartCount > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-600">
                      {cartCount}
                    </span>
                  )}
                </Link>
              )}
              {user && (
                <Link
                  to="/profile"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <UserRound size={15} className="text-emerald-600" />
                  {t('nav_account')}
                </Link>
              )}
              {(user?.is_admin || user?.role === 'staff') && (
                <Link
                  to="/admin/dashboard"
                  onClick={() => setShowMobileMenu(false)}
                  className={`flex items-center gap-2 border-t border-slate-100 px-5 py-3 text-sm font-semibold transition ${
                    user?.is_admin ? 'text-sky-700 hover:bg-sky-50' : 'text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  <ShieldCheck size={15} />
                  {user?.is_admin ? 'Dashboard' : 'Quản lý'}
                </Link>
              )}
            </nav>

            {/* Settings + Login/Logout */}
            <div className="space-y-1 border-t border-slate-100 p-3">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Contrast size={15} className="text-slate-500" />
                <span className="flex-1 text-left">{t('nav_settings_theme')}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  {theme === 'mono' ? t('nav_settings_theme_color') : t('nav_settings_theme_mono')}
                </span>
              </button>

              <div className="flex items-center gap-3 rounded-xl px-4 py-2">
                <Languages size={15} className="shrink-0 text-slate-500" />
                <span className="flex-1 text-sm font-semibold text-slate-700">{t('nav_settings_language')}</span>
                <div className="flex gap-1">
                  {['vi', 'en'].map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setLanguage(lang)}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold transition ${
                        language === lang ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  <LogOut size={15} />
                  {t('nav_logout')}
                </button>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  {t('nav_login')}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default Navbar;