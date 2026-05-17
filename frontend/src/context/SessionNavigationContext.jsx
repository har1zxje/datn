import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import {
  abortNavigationTasks,
  getNavigationSignal,
  registerNavigationCleanup,
} from '../services/navigationTasks';
import { clearChatbotCache } from '../services/chatbot';

const ACTIVE_USER_KEY = 'freshfood:current_user_id';
const SESSION_RESET_EVENT = 'freshfood:session-reset';
const SESSION_CACHE_PREFIXES = [
  'freshfood:chat-history:',
  'freshfood:activity-history:',
  'freshfood:session-cache:',
];

const SessionNavigationContext = createContext(null);

const getUserSessionId = (user) => {
  if (!user) return null;
  return String(user.id ?? user.user_id ?? user.username ?? user.email ?? '');
};

const clearSessionStorageForUser = (userId) => {
  if (!userId) return;

  SESSION_CACHE_PREFIXES.forEach((prefix) => {
    localStorage.removeItem(`${prefix}${userId}`);
  });
};

export const clearAllSessionScopedStorage = () => {
  const keysToRemove = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && SESSION_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
};

export const SessionNavigationProvider = ({ children }) => {
  const location = useLocation();
  const { user, loading } = useAuth();
  const currentUserId = getUserSessionId(user);
  const previousUserIdRef = useRef(localStorage.getItem(ACTIVE_USER_KEY));
  const [sessionResetVersion, setSessionResetVersion] = useState(0);

  useEffect(() => {
    abortNavigationTasks('route-change');
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (loading) return;

    const previousUserId = previousUserIdRef.current;
    const userChanged = previousUserId !== currentUserId;

    if (!userChanged) return;

    if (previousUserId) {
      clearSessionStorageForUser(previousUserId);
    }

    clearChatbotCache();
    abortNavigationTasks('account-change');

    if (currentUserId) {
      localStorage.setItem(ACTIVE_USER_KEY, currentUserId);
    } else {
      localStorage.removeItem(ACTIVE_USER_KEY);
    }

    previousUserIdRef.current = currentUserId;
    setSessionResetVersion((version) => version + 1);

    window.dispatchEvent(
      new CustomEvent(SESSION_RESET_EVENT, {
        detail: {
          previous_user_id: previousUserId,
          current_user_id: currentUserId,
        },
      })
    );
  }, [currentUserId, loading]);

  const value = useMemo(
    () => ({
      currentUserId,
      sessionResetVersion,
      getNavigationSignal,
      abortNavigationTasks,
      registerNavigationCleanup,
    }),
    [currentUserId, sessionResetVersion]
  );

  return (
    <SessionNavigationContext.Provider value={value}>
      {children}
    </SessionNavigationContext.Provider>
  );
};

export const useSessionNavigation = () => {
  const context = useContext(SessionNavigationContext);
  if (!context) {
    throw new Error('useSessionNavigation must be used inside SessionNavigationProvider');
  }
  return context;
};
