import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService, extractErrorMessage } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState('');

  // Restore session from localStorage / sessionStorage on app load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('nwis_access_token') || sessionStorage.getItem('nwis_access_token');
        const storedUser = localStorage.getItem('nwis_user') || sessionStorage.getItem('nwis_user');

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);

          // Optional background refresh / validation with backend /auth/me
          try {
            const freshUser = await authService.getMe();
            if (freshUser) {
              setUser(freshUser);
              const storage = localStorage.getItem('nwis_access_token') ? localStorage : sessionStorage;
              storage.setItem('nwis_user', JSON.stringify(freshUser));
            }
          } catch (err) {
            // If offline or 401, error interceptor will handle it
            console.warn('Backend user re-validation warning:', err.message);
          }
        }
      } catch (e) {
        console.error('Failed to parse cached auth state:', e);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for 401 session expiry events from api interceptor
    const handleAuthExpired = () => {
      setUser(null);
      setToken(null);
      setSessionExpiredMessage('Your session has expired. Please sign in again to continue.');
    };

    window.addEventListener('nwis_auth_expired', handleAuthExpired);
    return () => window.removeEventListener('nwis_auth_expired', handleAuthExpired);
  }, []);

  // Login handler
  const login = useCallback(async (email, password, rememberMe = true) => {
    setSessionExpiredMessage('');
    const data = await authService.login({ email, password });
    
    const accessToken = data.access_token;
    const userProfile = data.user;
    const refreshToken = data.refresh_token;

    // Choose storage based on Remember This Device
    const storage = rememberMe ? localStorage : sessionStorage;
    const altStorage = rememberMe ? sessionStorage : localStorage;

    // Clear opposite storage to avoid stale tokens
    altStorage.removeItem('nwis_access_token');
    altStorage.removeItem('nwis_refresh_token');
    altStorage.removeItem('nwis_user');

    storage.setItem('nwis_access_token', accessToken);
    if (refreshToken) {
      storage.setItem('nwis_refresh_token', refreshToken);
    }
    storage.setItem('nwis_user', JSON.stringify(userProfile));

    setToken(accessToken);
    setUser(userProfile);

    return userProfile;
  }, []);

  // Logout handler
  const logout = useCallback(() => {
    localStorage.removeItem('nwis_access_token');
    localStorage.removeItem('nwis_refresh_token');
    localStorage.removeItem('nwis_user');

    sessionStorage.removeItem('nwis_access_token');
    sessionStorage.removeItem('nwis_refresh_token');
    sessionStorage.removeItem('nwis_user');

    setToken(null);
    setUser(null);
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    sessionExpiredMessage,
    clearExpiredMessage: () => setSessionExpiredMessage(''),
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
