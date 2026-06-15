import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  clearAuthSession,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
} from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      setLoading(false);
      setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    };

    clearAuthSession();
    setUser(null);
    setLoading(false);
    setError(null);

    window.addEventListener('freshfood:auth-expired', handleSessionExpired);
    return () => window.removeEventListener('freshfood:auth-expired', handleSessionExpired);
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiLogin(username, password);
      setUser(response.user);
      return response;
    } catch (err) {
      setError(err.detail || 'Lỗi đăng nhập');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      return await apiRegister(userData);
    } catch (err) {
      setError(err.detail || 'Lỗi đăng ký');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (updates) => {
    const nextUser = { ...(user || {}), ...updates };
    setUser(nextUser);
    localStorage.setItem('user', JSON.stringify(nextUser));
    return nextUser;
  };

  const logout = () => {
    setUser(null);
    setError(null);
    apiLogout();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, updateUser, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng trong AuthProvider');
  }
  return context;
};
