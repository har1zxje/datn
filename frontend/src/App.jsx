import { useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './App.css';

import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import ChatWidget from './components/chat/ChatWidget';
import Home from './pages/Home';
import Products from './pages/Products';
import Auth from './pages/Auth';
import Cart from './pages/Cart';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import Favorites from './pages/Favorites';
import FreshnessConfirm from './pages/FreshnessConfirm';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SessionNavigationProvider } from './context/SessionNavigationContext';
import { AppSettingsProvider } from './context/AppSettingsContext';
import { FavoritesProvider } from './context/FavoritesContext';

const RouteLoader = () => (
  <div className="flex min-h-[50vh] items-center justify-center bg-[oklch(0.985_0.008_150)] text-sm font-semibold text-slate-600">
    Đang xác thực phiên đăng nhập...
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <RouteLoader />;
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (!user || (!user.is_admin && user.role !== 'staff')) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <AppSettingsProvider>
        <FavoritesProvider>
          <CartProvider>
            <Router>
              <SessionNavigationProvider>
                <AppShell />
              </SessionNavigationProvider>
            </Router>
          </CartProvider>
        </FavoritesProvider>
      </AppSettingsProvider>
    </AuthProvider>
  );
}

const AppShell = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    document.body.classList.toggle('admin-route', isAdminRoute);
    return () => {
      document.body.classList.remove('admin-route');
    };
  }, [isAdminRoute]);

  return (
    <div className="app-wrapper font-sans">
      {!isAdminRoute && <Navbar />}

      <main className={isAdminRoute ? 'admin-main' : 'main-content'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Products />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/auth" element={<Auth />} />

          <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/orders/:orderId/confirm-freshness" element={<ProtectedRoute><FreshnessConfirm /></ProtectedRoute>} />

          <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/dashboard/:section" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!isAdminRoute && <Footer />}
      {!isAdminRoute && <ChatWidget />}
    </div>
  );
};

export default App;
