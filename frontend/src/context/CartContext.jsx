import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

export const CartContext = createContext();

const resolveCartOwner = (user) => {
  if (!user) return 'guest';
  const id = String(user.id ?? user.username ?? user.email);
  const scope = user.is_admin ? 'admin' : 'customer';
  return `${id}:${scope}`;
};

const storageKey = (owner) => `freshfood_cart_${owner}`;

const loadCart = (owner) => {
  try {
    const raw = localStorage.getItem(storageKey(owner));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveCart = (owner, items) => {
  try {
    localStorage.setItem(storageKey(owner), JSON.stringify(items));
  } catch {
    // localStorage không khả dụng (private mode, quota)
  }
};

const clearCart = (owner) => {
  try {
    localStorage.removeItem(storageKey(owner));
  } catch { /* noop */ }
};

export const CartProvider = ({ children }) => {
  const { user, loading } = useAuth();
  const canUseCart = !user?.is_admin;

  const ownerRef = useRef(resolveCartOwner(user));

  // Khởi tạo cart từ localStorage theo owner hiện tại
  const [cartItems, setCartItems] = useState(() => {
    const owner = resolveCartOwner(user);
    return canUseCart ? loadCart(owner) : [];
  });

  // Khi user thay đổi (đăng nhập/đăng xuất): load cart của owner mới
  useEffect(() => {
    if (loading) return;

    const nextOwner = resolveCartOwner(user);
    if (ownerRef.current === nextOwner) return;

    ownerRef.current = nextOwner;

    if (!user?.is_admin) {
      setCartItems(loadCart(nextOwner));
    } else {
      setCartItems([]);
    }
  }, [user, loading]);

  // Admin không được dùng cart — clear ngay nếu bị switch
  useEffect(() => {
    if (!canUseCart && cartItems.length > 0) {
      setCartItems([]);
    }
  }, [canUseCart]);

  // Đồng bộ xuống localStorage mỗi khi cartItems thay đổi
  useEffect(() => {
    if (loading) return;
    const owner = ownerRef.current;
    if (canUseCart) {
      saveCart(owner, cartItems);
    } else {
      clearCart(owner);
    }
  }, [cartItems, loading, canUseCart]);

  // ---- Actions ----

  const addToCart = (product, quantity = 1) => {
    if (!canUseCart) return false;
    setCartItems((prev) => {
      const exist = prev.find((item) => item.id === product.id);
      if (exist) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + quantity } : item
        );
      }
      return [...prev, { ...product, qty: quantity }];
    });
    return true;
  };

  const removeFromCart = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  /** Xóa nhiều sản phẩm cùng lúc theo danh sách id — dùng sau khi checkout chọn lọc */
  const removeItems = (ids) => {
    const idSet = new Set(ids);
    setCartItems((prev) => prev.filter((item) => !idSet.has(item.id)));
  };

  const updateQuantity = (id, quantity) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, qty: quantity } : item))
    );
  };

  const clearAllCart = () => {
    setCartItems([]);
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.qty, 0);

  const getCartTotal = (itemSubset) => {
    const list = itemSubset ?? cartItems;
    return list.reduce((total, item) => {
      const priceNum =
        typeof item.price === 'number'
          ? item.price
          : parseInt(item.price.toString().replace(/\./g, ''), 10);
      return total + priceNum * item.qty;
    }, 0);
  };

  const isEmpty = cartItems.length === 0;

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        removeItems,
        updateQuantity,
        clearCart: clearAllCart,
        cartCount,
        getCartTotal,
        isEmpty,
        canUseCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart phải được dùng trong CartProvider');
  return context;
};
