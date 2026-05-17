import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';

import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import ChatWidget from './components/chat/ChatWidget';
import Home from './pages/Home';
import Products from './pages/Products';
import Scanner from './pages/Scanner';
import Auth from './pages/Auth';
import Cart from './pages/Cart';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SessionNavigationProvider } from './context/SessionNavigationContext';

const RouteLoader = () => (
  <div className="flex min-h-[50vh] items-center justify-center bg-[oklch(0.985_0.008_150)] text-sm font-semibold text-slate-600">
    Đang xác thực phiên đăng nhập...
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <RouteLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <RouteLoader />;
  }

  if (!user || !user.is_admin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <SessionNavigationProvider>
            <AppShell />
          </SessionNavigationProvider>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

const AppShell = () => {
  const location = useLocation();
  const isScannerRoute = location.pathname === '/scanner';

  useEffect(() => {
    document.body.classList.toggle('scanner-route', isScannerRoute);
    return () => document.body.classList.remove('scanner-route');
  }, [isScannerRoute]);

  return (
    <div className="app-wrapper">
      {!isScannerRoute && <Navbar />}

      <main className={isScannerRoute ? 'scanner-main' : 'main-content chat-safe'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Products />} />
          <Route path="/auth" element={<Auth />} />

          <Route path="/scanner" element={<ProtectedRoute><Scanner /></ProtectedRoute>} />
          <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          <Route
            path="/admin/dashboard"
            element={<AdminRoute><AdminDashboard /></AdminRoute>}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!isScannerRoute && <Footer />}
      {!isScannerRoute && <ChatWidget />}
    </div>
  );
};

export default App;
