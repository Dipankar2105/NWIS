import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { alertsService, wellsService, dashboardService, extractErrorMessage } from '../services/api';
import { useAuth } from './AuthContext';

const AppContext = createContext(null);

// Persist selected well in sessionStorage so refresh preserves context
const WELL_STORAGE_KEY = 'nwis_selected_well_id';
const FIELD_STORAGE_KEY = 'nwis_selected_field';

const getStoredWellId = () => {
  try {
    return sessionStorage.getItem(WELL_STORAGE_KEY) || 'DUL-235';
  } catch { return 'DUL-235'; }
};

const getStoredField = () => {
  try {
    return sessionStorage.getItem(FIELD_STORAGE_KEY) || 'Duliajan Field';
  } catch { return 'Duliajan Field'; }
};

export const AppProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  // Shared Global State — loaded from sessionStorage for refresh persistence
  const [selectedField, _setSelectedField] = useState(getStoredField);
  const [selectedWellId, _setSelectedWellId] = useState(getStoredWellId);
  const [selectedWell, setSelectedWell] = useState(null);
  const [selectedRadius, setSelectedRadius] = useState('10 km');
  const [wells, setWells] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dashboardOverview, setDashboardOverview] = useState(null);

  // Refs to avoid stale closures
  const wellsRef = useRef(wells);
  wellsRef.current = wells;

  // Persist selected field
  const setSelectedField = useCallback((field) => {
    _setSelectedField(field);
    try { sessionStorage.setItem(FIELD_STORAGE_KEY, field); } catch { /* ignore */ }
  }, []);

  // Persist selected well ID
  const setSelectedWellId = useCallback((id) => {
    _setSelectedWellId(id);
    try { sessionStorage.setItem(WELL_STORAGE_KEY, id); } catch { /* ignore */ }
  }, []);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch active alerts from backend
  const refreshAlerts = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingAlerts(true);
    try {
      const data = await alertsService.getActive();
      const list = Array.isArray(data) ? data : (data?.alerts || []);
      setActiveAlerts(list);
      setNotificationCount(list.length);
      setLastUpdated(new Date());
    } catch (err) {
      console.warn('Failed to refresh active alerts:', err.message);
    } finally {
      setIsLoadingAlerts(false);
    }
  }, [isAuthenticated]);

  // Fetch all wells for global reference
  const refreshWells = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await wellsService.getAll({ page_size: 100 });
      const list = Array.isArray(data) ? data : (data?.wells || []);
      setWells(list);
      // Restore selected well from stored ID
      const storedId = getStoredWellId();
      if (list.length > 0) {
        const found = list.find(w =>
          String(w.id) === String(storedId) ||
          w.name === storedId ||
          w.well_name === storedId
        );
        if (found) setSelectedWell(found);
        else setSelectedWell(list[0]);
      }
    } catch (err) {
      console.warn('Failed to load global wells:', err.message);
    }
  }, [isAuthenticated]);

  // Fetch dashboard overview for global KPI context
  const refreshDashboard = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await dashboardService.getOverview();
      setDashboardOverview(data);
    } catch (err) {
      console.warn('Failed to refresh dashboard overview:', err.message);
    }
  }, [isAuthenticated]);

  // Handle Well Selection across any screen
  const selectWell = useCallback((wellOrId) => {
    if (!wellOrId) return;
    if (typeof wellOrId === 'string') {
      setSelectedWellId(wellOrId);
      const found = wellsRef.current.find(w =>
        String(w.id) === String(wellOrId) ||
        w.name === wellOrId ||
        w.well_name === wellOrId
      );
      if (found) setSelectedWell(found);
    } else if (typeof wellOrId === 'object') {
      setSelectedWell(wellOrId);
      const id = wellOrId.id || wellOrId.name || wellOrId.well_name;
      setSelectedWellId(id);
    }
  }, [setSelectedWellId]);

  // Acknowledge alert via backend PUT /alerts/{id}/acknowledge
  const acknowledgeAlert = useCallback(async (alertId, feedback = 'Acknowledged by operator') => {
    try {
      await alertsService.acknowledge(alertId, feedback);
      // Immediately update local state
      setActiveAlerts(prev => prev.filter(a => String(a.id) !== String(alertId)));
      setNotificationCount(prev => Math.max(0, prev - 1));
      return { success: true };
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
      return { success: false, error: extractErrorMessage(err) };
    }
  }, []);

  // Add new alert to state (for real-time simulation)
  const addAlert = useCallback((alert) => {
    setActiveAlerts(prev => [alert, ...prev]);
    setNotificationCount(prev => prev + 1);
  }, []);

  // Trigger global refresh
  const triggerGlobalRefresh = useCallback(async () => {
    setLastUpdated(new Date());
    await Promise.all([
      refreshAlerts(),
      refreshWells(),
      refreshDashboard()
    ]);
  }, [refreshAlerts, refreshWells, refreshDashboard]);

  // Invalidate well list (after create/update/archive)
  const invalidateWells = useCallback(async () => {
    await refreshWells();
    await refreshDashboard();
  }, [refreshWells, refreshDashboard]);

  // Load initial global data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshAlerts();
      refreshWells();
      refreshDashboard();
    }
  }, [isAuthenticated]); // eslint-disable-line

  // Poll alerts every 2 minutes
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      if (isOnline) refreshAlerts();
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, isOnline, refreshAlerts]);

  const value = {
    selectedField,
    setSelectedField,
    selectedWellId,
    setSelectedWellId: setSelectedWellId,
    selectedWell,
    setSelectedWell,
    selectWell,
    selectedRadius,
    setSelectedRadius,
    wells,
    activeAlerts,
    notificationCount,
    isLoadingAlerts,
    lastUpdated,
    isOnline,
    dashboardOverview,
    acknowledgeAlert,
    addAlert,
    refreshAlerts,
    refreshWells,
    refreshDashboard,
    invalidateWells,
    triggerGlobalRefresh
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;
