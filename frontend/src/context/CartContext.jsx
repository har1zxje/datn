import React, { createContext, useEffect, useRef, useState, useContext } from 'react';
import { useAuth } from './AuthContext';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user, loading } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const cartOwnerRef = useRef(user ? String(user.id ?? user.username ?? user.email) : 'guest');

  useEffect(() => {
    if (loading) return;

    const nextOwner = user ? String(user.id ?? user.username ?? user.email) : 'guest';
    if (cartOwnerRef.current === nextOwner) return;

    cartOwnerRef.current = nextOwner;
    setCartItems([]);
  }, [user, loading]);

  // Thêm sản phẩm vào giỏ hàng
  const addToCart = (product, quantity = 1) => {
    setCartItems(prev => {
      const exist = prev.find(item => item.id === product.id);
      if (exist) {
        // Nếu sản phẩm đã tồn tại, tăng số lượng
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, qty: item.qty + quantity } 
            : item
        );
      }
      // Thêm sản phẩm mới vào giỏ
      return [...prev, { ...product, qty: quantity }];
    });
  };

  // Xóa sản phẩm khỏi giỏ hàng
  const removeFromCart = (id) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  // Cập nhật số lượng sản phẩm
  const updateQuantity = (id, quantity) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCartItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, qty: quantity } : item
      )
    );
  };

  // Xóa tất cả sản phẩm khỏi giỏ hàng
  const clearCart = () => {
    setCartItems([]);
  };

  // Tính số lượng sản phẩm trong giỏ
  const cartCount = cartItems.reduce((acc, item) => acc + item.qty, 0);

  // Tính tổng tiền
  const getCartTotal = () => {
    return cartItems.reduce((total, item) => {
      const priceNum = typeof item.price === 'number' 
        ? item.price 
        : parseInt(item.price.toString().replace(/\./g, ''));
      return total + (priceNum * item.qty);
    }, 0);
  };

  // Kiểm tra giỏ hàng trống
  const isEmpty = cartItems.length === 0;

  return (
    <CartContext.Provider 
      value={{ 
        cartItems, 
        addToCart, 
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        getCartTotal,
        isEmpty
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart phải được sử dụng trong CartProvider');
  }
  return context;
};
