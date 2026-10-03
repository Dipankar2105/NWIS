import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api/v1' : 'http://127.0.0.1:8000/api/v1');

// Export base URL for non-axios usages
export { API_BASE_URL };

// Centralized Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Bearer Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nwis_access_token') || sessionStorage.getItem('nwis_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Error Handling & Session Expiry
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized (Expired or Invalid session)
    if (error.response && error.response.status === 401) {
      const isLoginRequest = originalRequest.url && originalRequest.url.includes('/auth/login');
      if (!isLoginRequest) {
        // Clear stored tokens and emit custom session-expired event
        localStorage.removeItem('nwis_access_token');
        sessionStorage.removeItem('nwis_access_token');
        localStorage.removeItem('nwis_user');
        sessionStorage.removeItem('nwis_user');
        window.dispatchEvent(new Event('nwis_auth_expired'));
      }
    }

    return Promise.reject(error);
  }
);

// Normalize API Error Message for user display
export const extractErrorMessage = (error) => {
  if (!error) return 'An unexpected error occurred.';
  
  if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
    return 'Unable to connect to NWIS services. Please verify your connection or ensure backend is running.';
  }

  if (error.response) {
    const status = error.response.status;
    const detail = error.response.data?.detail;

    if (status === 401) {
      return detail || 'Incorrect email or password.';
    }
    if (status === 403) {
      return detail || 'Your account is currently disabled or unauthorized. Contact your administrator.';
    }
    if (status === 422) {
      if (Array.isArray(detail) && detail.length > 0) {
        return detail.map(d => d.msg).join(', ');
      }
      return 'Please enter a valid work email and required password.';
    }
    if (status >= 500) {
      return 'NWIS server encountered an internal issue. Please try again later.';
    }
    return typeof detail === 'string' ? detail : 'Unable to complete authentication request.';
  }

  return error.message || 'Request failed. Please try again.';
};

// Centralized Auth API Service
export const authService = {
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },
  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
  updateProfile: async (profileData) => {
    const response = await apiClient.put('/auth/profile', profileData);
    return response.data;
  }
};

// Dashboard API Service
export const dashboardService = {
  getOverview: async (operationalArea = null) => {
    const params = operationalArea ? { operational_area: operationalArea } : {};
    const response = await apiClient.get('/dashboard/overview', { params });
    return response.data;
  }
};

// Alerts API Service
export const alertsService = {
  getActive: async (wellId = null, severity = null) => {
    const params = {};
    if (wellId) params.well_id = wellId;
    if (severity) params.severity = severity;
    const response = await apiClient.get('/alerts/active', { params });
    return response.data;
  },
  acknowledge: async (alertId, feedback = '') => {
    const response = await apiClient.put(`/alerts/${alertId}/acknowledge`, { feedback });
    return response.data;
  },
  simulate: async (wellId, simulateDepth) => {
    const response = await apiClient.post('/alerts/simulate', {
      well_id: wellId,
      simulate_depth: simulateDepth,
    });
    return response.data;
  }
};

// Analytics & Correlation API Service
export const analyticsService = {
  correlate: async (payload) => {
    const response = await apiClient.post('/analytics/correlation', payload);
    return response.data;
  },
  correlateFormations: async (payload) => {
    const response = await apiClient.post('/analytics/correlation/formations', payload);
    return response.data;
  },
  whatIf: async (payload) => {
    const response = await apiClient.post('/analytics/what-if', payload);
    return response.data;
  },
  getRecipes: async (payload) => {
    const response = await apiClient.post('/analytics/recipes', payload);
    return response.data;
  }
};

// Events API Service
export const eventsService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/events', { params });
    return response.data;
  },
  getById: async (eventId) => {
    const response = await apiClient.get(`/events/${eventId}`);
    return response.data;
  },
  getByFormation: async (formation) => {
    const response = await apiClient.get(`/events/by-formation`, { params: { formation } });
    return response.data;
  },
  create: async (eventData) => {
    const response = await apiClient.post('/events', eventData);
    return response.data;
  },
  update: async (eventId, eventData) => {
    const response = await apiClient.put(`/events/${eventId}`, eventData);
    return response.data;
  },
  delete: async (eventId) => {
    const response = await apiClient.delete(`/events/${eventId}`);
    return response.data;
  }
};

// Wells API Service
export const wellsService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/wells', { params });
    return response.data;
  },
  getById: async (wellId) => {
    const response = await apiClient.get(`/wells/${wellId}`);
    return response.data;
  },
  getNearby: async (wellId, radiusKm = 10) => {
    try {
      const response = await apiClient.get(`/wells/${wellId}/nearby`, {
        params: { radius_km: radiusKm }
      });
      return response.data;
    } catch {
      return [];
    }
  },
  getInRadius: async (lat, lon, radiusKm = 10) => {
    const response = await apiClient.get('/geo/wells-in-radius', {
      params: { lat, lon, radius_km: radiusKm }
    });
    return response.data;
  },
  create: async (wellData) => {
    const response = await apiClient.post('/wells', wellData);
    return response.data;
  },
  update: async (wellId, wellData) => {
    const response = await apiClient.put(`/wells/${wellId}`, wellData);
    return response.data;
  },
  archive: async (wellId, reason = '') => {
    const response = await apiClient.put(`/wells/${wellId}/archive`, { reason });
    return response.data;
  },
  delete: async (wellId) => {
    const response = await apiClient.delete(`/wells/${wellId}`);
    return response.data;
  }
};

// Predictions & Risk API Service
export const predictionsService = {
  assessRisk: async (payload) => {
    const response = await apiClient.post('/predictions/risk-assessment', payload);
    return response.data;
  },
  whatIf: async (payload) => {
    const response = await apiClient.post('/predictions/what-if', payload);
    return response.data;
  }
};

// Documents API Service
export const documentsService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/documents', { params });
    return response.data;
  },
  getById: async (docId) => {
    const response = await apiClient.get(`/documents/${docId}`);
    return response.data;
  },
  getStatus: async (docId) => {
    const response = await apiClient.get(`/documents/${docId}/status`);
    return response.data;
  },
  getExtraction: async (docId) => {
    const response = await apiClient.get(`/documents/${docId}/extraction`);
    return response.data;
  },
  getChunks: async (docId) => {
    const response = await apiClient.get(`/documents/${docId}/chunks`);
    return response.data;
  },
  upload: async (formData, onUploadProgress) => {
    const response = await apiClient.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress
    });
    return response.data;
  },
  retryProcessing: async (docId) => {
    const response = await apiClient.post(`/documents/${docId}/retry`);
    return response.data;
  },
  archive: async (docId) => {
    const response = await apiClient.put(`/documents/${docId}/archive`);
    return response.data;
  },
  delete: async (docId) => {
    const response = await apiClient.delete(`/documents/${docId}`);
    return response.data;
  }
};

// Alerts Extended Service
export const alertsExtendedService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/alerts', { params });
    return response.data;
  },
  resolve: async (alertId, feedback = '') => {
    const response = await apiClient.put(`/alerts/${alertId}/resolve`, { feedback });
    return response.data;
  },
  create: async (alertData) => {
    const response = await apiClient.post('/alerts', alertData);
    return response.data;
  }
};

// User / Profile API Service
export const userService = {
  getProfile: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
  updateProfile: async (profileData) => {
    const response = await apiClient.put('/auth/profile', profileData);
    return response.data;
  },
  changePassword: async (data) => {
    const response = await apiClient.put('/auth/change-password', data);
    return response.data;
  },
  updateNotificationPrefs: async (prefs) => {
    const response = await apiClient.put('/auth/notification-preferences', prefs);
    return response.data;
  },
  listUsers: async () => {
    const response = await apiClient.get('/auth/users');
    return response.data;
  }
};

// Admin / Data Admin Service
export const adminService = {
  generateDemoData: async (config) => {
    const response = await apiClient.post('/admin/generate-demo-data', config);
    return response.data;
  },
  resetDemoData: async (confirmToken) => {
    const response = await apiClient.post('/admin/reset-demo-data', { confirm_token: confirmToken });
    return response.data;
  },
  importWellsCSV: async (formData) => {
    const response = await apiClient.post('/admin/import/wells', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  importEventsCSV: async (formData) => {
    const response = await apiClient.post('/admin/import/events', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  simulateAlert: async (payload) => {
    const response = await apiClient.post('/alerts/simulate', payload);
    return response.data;
  }
};

// Export / Download Service  
export const exportService = {
  exportWells: async (params = {}) => {
    const response = await apiClient.get('/export/wells', { params, responseType: 'blob' });
    return response;
  },
  exportEvents: async (params = {}) => {
    const response = await apiClient.get('/export/events', { params, responseType: 'blob' });
    return response;
  },
  exportAuditLog: async (params = {}) => {
    const response = await apiClient.get('/export/audit-log', { params, responseType: 'blob' });
    return response;
  },
  exportAlerts: async (params = {}) => {
    const response = await apiClient.get('/export/alerts', { params, responseType: 'blob' });
    return response;
  },
  // generate CSV from data on frontend
  generateCSVBlob: (headers, rows) => {
    const escape = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g, '""');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s + '"';
      }
      return s;
    };
    const headerLine = headers.join(',');
    const dataLines = (rows || []).map((row) => headers.map((h) => escape(row[h])).join(','));
    const csv = [headerLine, ...dataLines].join('\n');
    return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  },
  downloadBlob: (blob, filename) => {
    filename = filename || 'nwis_export.csv';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  downloadJSON: (data, filename) => {
    filename = filename || 'nwis_export.json';
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    exportService.downloadBlob(blob, filename);
  }
};

// Audit Log Service
export const auditService = {
  getLogs: async (params = {}) => {
    const response = await apiClient.get('/audit', { params });
    return response.data;
  },
  createEntry: async (entry) => {
    const response = await apiClient.post('/audit', entry);
    return response.data;
  },
  log: async (action, target, module, details = {}) => {
    try {
      await apiClient.post('/audit', { action, target, module, details });
    } catch {
      // Audit logging failures should not break the UI
    }
  }
};

// Settings Service
export const settingsService = {
  getSettings: async () => {
    const response = await apiClient.get('/system/settings');
    return response.data;
  },
  updateSettings: async (settings) => {
    const response = await apiClient.put('/system/settings', settings);
    return response.data;
  },
  resetSettings: async () => {
    const response = await apiClient.post('/system/settings/reset');
    return response.data;
  }
};

// Knowledge & AI Grounded RAG API Service
export const knowledgeService = {
  query: async (requestPayload) => {
    const response = await apiClient.post('/knowledge/query', requestPayload);
    return response.data;
  },
  getDrillingRecipes: async (formation, area = null) => {
    const params = { formation };
    if (area) params.area = area;
    const response = await apiClient.get('/knowledge/drilling-recipes', { params });
    return response.data;
  }
};

// Geo API Service
export const geoService = {
  getWellsInRadius: async (lat, lon, radiusKm = 10) => {
    const response = await apiClient.get('/geo/wells-in-radius', {
      params: { lat, lon, radius_km: radiusKm }
    });
    return response.data;
  },
  getEventHeatmap: async (params = {}) => {
    const response = await apiClient.get('/geo/event-heatmap', { params });
    return response.data;
  }
};

// Query History & Audit API Service
export const queryHistoryService = {
  getAll: async (limit = 50) => {
    const response = await apiClient.get('/query-history', { params: { limit } });
    return response.data;
  },
  getById: async (queryId) => {
    const response = await apiClient.get(`/query-history/${queryId}`);
    return response.data;
  },
  deleteItem: async (queryId) => {
    const response = await apiClient.delete(`/query-history/${queryId}`);
    return response.data;
  }
};

// System & Health API Service
export const systemService = {
  getHealth: async () => {
    const base = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    const response = await axios.get(`${base}/health`, { timeout: 5000 });
    return response.data;
  },
  getProviders: async () => {
    const response = await apiClient.get('/system/providers');
    return response.data;
  },
  getMultilingual: async () => {
    const response = await apiClient.get('/system/multilingual');
    return response.data;
  }
};

// Reference Wells & Wireline Logs API Service
export const referenceWellsService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/reference-wells', { params });
    return response.data;
  },
  getById: async (wellId) => {
    const response = await apiClient.get(`/reference-wells/${wellId}`);
    return response.data;
  },
  getLogs: async (wellId, params = {}) => {
    const response = await apiClient.get(`/reference-wells/${wellId}/logs`, { params });
    return response.data;
  },
  getFormations: async (wellId) => {
    const response = await apiClient.get(`/reference-wells/${wellId}/formations`);
    return response.data;
  },
  getTrajectory: async (wellId) => {
    const response = await apiClient.get(`/reference-wells/${wellId}/trajectory`);
    return response.data;
  },
  getParameters: async (wellId) => {
    const response = await apiClient.get(`/reference-wells/${wellId}/parameters`);
    return response.data;
  }
};

// Data Sources & Catalog API Service
export const dataSourcesService = {
  getCatalog: async () => {
    const response = await apiClient.get('/data-sources');
    return response.data;
  },
  getIngestionStatus: async () => {
    const response = await apiClient.get('/data/ingestion-status');
    return response.data;
  },
  importCSV: async (formData) => {
    const response = await apiClient.post('/data/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  generateDemo: async (payload) => {
    const response = await apiClient.post('/data/generate-demo', payload);
    return response.data;
  }
};

export default apiClient;



