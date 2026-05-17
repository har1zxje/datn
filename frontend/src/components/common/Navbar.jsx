import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bot,
  ChevronDown,
  LogOut,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  ShoppingCart,
  Truck,
  UserRound,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { marketQuickDeals, smartSearchSuggestions } from '../../data/marketNavigation';
import AuthModal from './AuthModal';

const BrandMark = () => (
  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-300/95 text-emerald-900 shadow-sm ring-1 ring-amber-200">
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <path d="M4.2 12a7.8 7.8 0 1 1 3.2 6.3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M11.9 16.2V9.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M11.9 9.6c1.8 0 3.2 1.4 3.2 3.2-1.8 0-3.2-1.4-3.2-3.2Z" stroke="currentColor" strokeWidth="1.9" />
      <path d="M11.9 10.5c-1.5 0-2.8 1.2-2.8 2.8 1.5 0 2.8-1.2 2.8-2.8Z" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  </span>
);

const Navbar = () => {
  const { cartCount } = useCart();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const userMenuRef = useRef(null);

  const displayName = user?.full_name || user?.username || 'Khach hang';
  const userInitial = displayName.charAt(0).toUpperCase();

  const isActive = (path) => location.pathname === path;

  const goSearch = (value) => {
    const keyword = String(value || '').trim();
    if (!keyword) {
      navigate('/shop');
      return;
    }
    navigate(`/shop?q=${encodeURIComponent(keyword)}`);
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
    logout();
    navigate('/');
  };

  useEffect(() => {
    if (!showUserMenu) return;

    const handlePointerDown = (event) => {
      if (!userMenuRef.current?.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showUserMenu]);

  return (
    <>
      <nav className="navbar fresh-market-header" role="navigation" aria-label="Dieu huong chinh">
        <div className="fresh-container flex flex-col gap-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex shrink-0 items-center gap-3 rounded-lg text-white outline-none transition-all duration-300 hover:text-amber-200 focus-visible:ring-2 focus-visible:ring-amber-300"
              aria-label="NutriGro - Trang chu"
            >
              <BrandMark />
              <span className="leading-tight">
                <span className="block text-lg font-black tracking-tight">NutriGro</span>
                <span className="hidden text-xs font-semibold text-emerald-100 sm:block">
                  Nang luong xanh, Song trong lanh
                </span>
              </span>
            </Link>

            <form
              onSubmit={handleSearchSubmit}
              className="hidden min-w-0 flex-1 items-center rounded-full bg-white px-4 py-3 shadow-sm ring-1 ring-white/40 md:flex"
            >
              <Search size={20} className="shrink-0 text-slate-500" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tim rau cu huu co, trai cay, thuc pham sach..."
                className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white transition-all duration-300 hover:bg-emerald-700"
              >
                Tim kiem
              </button>
            </form>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="hidden items-center gap-2 rounded-full bg-emerald-600/85 px-4 py-3 text-sm font-bold text-white ring-1 ring-white/25 transition-all duration-300 hover:bg-emerald-600 lg:flex"
              >
                <MapPin size={18} />
                Chon dia chi giao hang
                <ChevronDown size={16} />
              </button>

              <Link
                to="/cart"
                onClick={handleProtectedAction}
                className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-800 shadow-sm transition-all duration-300 hover:bg-amber-50 hover:shadow-md"
                title="Gio hang"
                aria-label="Gio hang"
              >
                <ShoppingCart size={22} />
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-600 px-1 text-xs font-black text-white">
                    {cartCount}
                  </span>
                )}
              </Link>

              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowUserMenu((current) => !current)}
                    className="flex h-12 items-center gap-2 rounded-full bg-white px-2 pe-4 text-sm font-bold text-slate-900 shadow-sm transition-all duration-300 hover:bg-amber-50 hover:shadow-md"
                    aria-expanded={showUserMenu}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                      {userInitial}
                    </span>
                    <span className="hidden max-w-28 truncate sm:inline">{displayName}</span>
                    <ChevronDown size={16} className="text-slate-500" />
                  </button>

                  {showUserMenu && (
                    <div className="absolute end-0 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                      <div className="border-b border-slate-100 bg-emerald-50 px-4 py-3">
                        <p className="font-bold text-slate-900">{displayName}</p>
                        <p className="truncate text-sm text-slate-600">{user?.email || user?.username}</p>
                        {user?.is_admin && (
                          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-1 text-xs font-bold text-sky-700">
                            <ShieldCheck size={13} />
                            Admin
                          </span>
                        )}
                      </div>

                      <div className="py-2">
                        <Link
                          to="/profile"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 transition-all duration-300 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <UserRound size={17} />
                          Tai khoan cua toi
                        </Link>
                        <Link
                          to="/cart"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 transition-all duration-300 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <ShoppingCart size={17} />
                          Gio hang ({cartCount})
                        </Link>
                        <Link
                          to="/scanner"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 transition-all duration-300 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <Bot size={17} />
                          AI kiem dinh
                        </Link>

                        {user?.is_admin && (
                          <Link
                            to="/admin/dashboard"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm font-semibold text-sky-700 transition-all duration-300 hover:bg-sky-50"
                          >
                            <ShieldCheck size={17} />
                            Admin Dashboard
                          </Link>
                        )}

                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-left text-sm font-semibold text-rose-600 transition-all duration-300 hover:bg-rose-50"
                        >
                          <LogOut size={17} />
                          Dang xuat
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="hidden rounded-full bg-white px-4 py-3 text-sm font-black text-emerald-800 shadow-sm transition-all duration-300 hover:bg-amber-50 hover:shadow-md sm:inline-flex"
                >
                  Dang nhap
                </Link>
              )}
            </div>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center rounded-full bg-white px-4 py-3 shadow-sm md:hidden"
          >
            <Search size={20} className="shrink-0 text-slate-500" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tim rau, thit, ca..."
              className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
            />
          </form>

          <div className="market-scrollbar flex items-center gap-2 overflow-x-auto py-1">
            <Link
              to="/shop"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald-950/40 px-4 py-3 text-sm font-black text-white transition-all duration-300 hover:bg-emerald-950/55"
            >
              <Menu size={17} />
              Danh muc
            </Link>

            <div className="hidden shrink-0 items-center gap-4 md:flex">
              <Link
                to="/"
                className={`text-sm font-bold transition-all duration-300 ${
                  isActive('/') ? 'text-amber-200' : 'text-emerald-50 hover:text-amber-200'
                }`}
              >
                Trang chu
              </Link>
              <Link
                to="/shop"
                className={`text-sm font-bold transition-all duration-300 ${
                  isActive('/shop') ? 'text-amber-200' : 'text-emerald-50 hover:text-amber-200'
                }`}
              >
                Cua hang
              </Link>
              <Link
                to="/scanner"
                onClick={handleProtectedAction}
                className="inline-flex items-center gap-1 text-sm font-bold text-emerald-50 transition-all duration-300 hover:text-amber-200"
              >
                <Bot size={16} />
                AI kiem dinh
              </Link>
              {user?.is_admin && (
                <Link
                  to="/admin/dashboard"
                  className="inline-flex items-center gap-1 text-sm font-bold text-amber-200 transition-all duration-300 hover:text-white"
                >
                  <ShieldCheck size={16} />
                  Quan tri
                </Link>
              )}
            </div>

            <span className="hidden h-5 w-px shrink-0 bg-white/25 md:block" />

            {marketQuickDeals.map((deal) => (
              <button
                key={deal.value}
                type="button"
                onClick={() => goSearch(deal.value)}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/12 px-3 py-2 text-xs font-bold text-white ring-1 ring-white/15 transition-all duration-300 hover:bg-white/20"
              >
                {deal.label === 'Freeship 3km' && <Truck size={14} />}
                {deal.label}
              </button>
            ))}

            {smartSearchSuggestions.slice(0, 3).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => goSearch(suggestion)}
                className="inline-flex shrink-0 rounded-full bg-white px-3 py-2 text-xs font-bold text-emerald-800 shadow-sm transition-all duration-300 hover:bg-amber-100"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default Navbar;
