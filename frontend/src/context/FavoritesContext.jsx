import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext(null);

const getOwnerKey = (user) => String(user?.username ?? user?.email ?? user?.id ?? 'guest');
const getLegacyOwnerKey = (user) => String(user?.id ?? user?.username ?? user?.email ?? 'guest');
const getStorageKey = (ownerKey) => `freshfood:favorites:${ownerKey}`;

export const FavoritesProvider = ({ children }) => {
  const { user } = useAuth();
  const ownerKey = getOwnerKey(user);
  const legacyOwnerKey = getLegacyOwnerKey(user);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [hydratedKey, setHydratedKey] = useState('');

  useEffect(() => {
    setHydratedKey('');
    try {
      const primarySaved = localStorage.getItem(getStorageKey(ownerKey));
      const legacySaved = ownerKey !== legacyOwnerKey
        ? localStorage.getItem(getStorageKey(legacyOwnerKey))
        : null;
      const guestSaved = ownerKey !== 'guest'
        ? localStorage.getItem(getStorageKey('guest'))
        : null;

      const parsedPrimary = primarySaved ? JSON.parse(primarySaved) : [];
      const parsedLegacy = legacySaved ? JSON.parse(legacySaved) : [];
      const parsedGuest = guestSaved ? JSON.parse(guestSaved) : [];

      const merged = [
        ...(Array.isArray(parsedPrimary) ? parsedPrimary : []),
        ...(Array.isArray(parsedLegacy) ? parsedLegacy : []),
        ...(Array.isArray(parsedGuest) ? parsedGuest : []),
      ];

      const normalized = [...new Set(merged.map((id) => String(id)))];

      // Migrate guest/legacy favorites to current user key.
      if (normalized.length > 0 && ownerKey !== 'guest') {
        localStorage.setItem(getStorageKey(ownerKey), JSON.stringify(normalized));
      }

      // Clear temporary guest favorites after successful migration.
      if (ownerKey !== 'guest' && guestSaved) {
        localStorage.removeItem(getStorageKey('guest'));
      }

      const parsed = normalized;
      setFavoriteIds(Array.isArray(parsed) ? parsed : []);
      setHydratedKey(ownerKey);
    } catch {
      setFavoriteIds([]);
      setHydratedKey(ownerKey);
    }
  }, [ownerKey, legacyOwnerKey]);

  useEffect(() => {
    if (hydratedKey !== ownerKey) return;
    localStorage.setItem(getStorageKey(ownerKey), JSON.stringify(favoriteIds));
  }, [ownerKey, favoriteIds, hydratedKey]);

  const value = useMemo(() => ({
    favoriteIds,
    favoritesCount: favoriteIds.length,
    isFavorite: (id) => favoriteIds.includes(String(id)),
    toggleFavorite: (id) => {
      const normalizedId = String(id);
      setFavoriteIds((prev) => (
        prev.includes(normalizedId)
          ? prev.filter((item) => item !== normalizedId)
          : [...prev, normalizedId]
      ));
    },
    clearFavorites: () => setFavoriteIds([]),
  }), [favoriteIds]);

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites phải được sử dụng trong FavoritesProvider');
  }
  return context;
};
