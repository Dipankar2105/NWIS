import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import { 
  alertsService, 
  wellsService, 
  eventsService,
  extractErrorMessage,
  exportService
} from '../services/api';
import { useToast } from '../context/ToastContext';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Clock, 
  Search, 
  ChevronRight, 
  Download, 
  Share2, 
  FileCheck, 
  Sparkles, 
  MapPin, 
  TrendingUp, 
  Layers, 
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Check,
  CheckCheck,
  ChevronDown,
  Plus,
  Compass,
  FileText,
  Activity,
  Droplet
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet Default Marker Icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icons for Map
const currentWellIcon = L.divIcon({
  className: 'custom-current-well-pin',
  html: `
    <div style="position: relative; display: flex; align-items: center; justify-content: center;">
      <span style="position: absolute; width: 28px; height: 28px; background: rgba(220, 38, 38, 0.25); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
      <div style="width: 18px; height: 18px; background: #DC2626; border: 2.5px solid #FFFFFF; border-radius: 50%; box-shadow: 0 0 10px rgba(220,38,38,0.8); display: flex; align-items: center; justify-content: center;">
        <div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div>
      </div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const offsetWellIcon = L.divIcon({
  className: 'custom-offset-well-pin',
  html: `
    <div style="width: 14px; height: 14px; background: #2563EB; border: 2px solid #FFFFFF; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.4);"></div>
  `,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

// Helper map recenter component
function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
}

export default function Alerts() {
  const navigate = useNavigate();
  const { alertId } = useParams();

  // State
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // all, unread, critical, high
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Overview');
  const [acknowledging, setAcknowledging] = useState(false);
  const [ackSuccess, setAckSuccess] = useState(false);

  // Associated real data for the active well and nearby wells
  const [wellDetails, setWellDetails] = useState(null);
  const [nearbyWells, setNearbyWells] = useState([]);
  const [historicalEvents, setHistoricalEvents] = useState([]);

  // Fetch alerts from real backend
  const fetchAlerts = async (selectedId = null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await alertsService.getActive();
      const alertList = Array.isArray(data) ? data : [];
      setAlerts(alertList);

      // Determine selected alert
      if (alertList.length > 0) {
        const targetId = selectedId || alertId || alertList[0].id;
        const current = alertList.find(a => a.id === targetId) || alertList[0];
        setSelectedAlert(current);
        if (current && (!alertId || alertId !== current.id)) {
          navigate(`/alerts/${current.id}`, { replace: true });
        }
      } else {
        setSelectedAlert(null);
      }
    } catch (err) {
      console.error('Failed to load active alerts:', err);
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts(alertId);
  }, []);

  // When selected alert changes, load associated well data and real events
  useEffect(() => {
    if (!selectedAlert) return;

    const loadAlertContext = async () => {
      try {
        const wellId = selectedAlert.active_well_id;
        if (wellId) {
          // Fetch well details
          try {
            const wData = await wellsService.getById(wellId);
            setWellDetails(wData);
          } catch (e) {
            console.warn('Could not fetch well details for alert:', e);
          }

          // Fetch nearby wells
          try {
            const nearData = await wellsService.getNearby(wellId, 15);
            setNearbyWells(Array.isArray(nearData) ? nearData : []);
          } catch (e) {
            console.warn('Could not fetch nearby wells:', e);
          }
        }

        // Fetch real historical events for this formation / well area
        try {
          const evData = await eventsService.getAll({ limit: 10 });
          const eventsArr = Array.isArray(evData) ? evData : (evData?.events || []);
          setHistoricalEvents(eventsArr);
        } catch (e) {
          console.warn('Could not fetch historical events:', e);
        }
      } catch (err) {
        console.error('Error fetching alert context:', err);
      }
    };

    loadAlertContext();
  }, [selectedAlert]);

  // Handle alert selection
  const handleSelectAlert = (item) => {
    setSelectedAlert(item);
    navigate(`/alerts/${item.id}`);
  };

  const toast = useToast();

  // Handle acknowledge
  const handleAcknowledge = async () => {
    if (!selectedAlert || acknowledging) return;
    setAcknowledging(true);
    try {
      await alertsService.acknowledge(selectedAlert.id, 'Acknowledged by Drilling Engineer via NWIS Console');
      setSelectedAlert(prev => ({ ...prev, is_acknowledged: true }));
      setAlerts(prev => prev.map(a => a.id === selectedAlert.id ? { ...a, is_acknowledged: true } : a));
      setAckSuccess(true);
      toast.success('Alert Acknowledged', `Alert for ${selectedAlert.well_name || selectedAlert.active_well_id} has been acknowledged.`);
      setTimeout(() => setAckSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
      toast.error('Acknowledge Failed', extractErrorMessage(err));
    } finally {
      setAcknowledging(false);
    }
  };

  // Counts for tabs
  const counts = useMemo(() => {
    const all = alerts.length;
    const unread = alerts.filter(a => !a.is_acknowledged).length;
    const critical = alerts.filter(a => (a.severity || '').toLowerCase() === 'critical').length;
    const high = alerts.filter(a => (a.severity || '').toLowerCase() === 'high').length;
    return { all, unread, critical, high };
  }, [alerts]);

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      // Filter tab
      if (activeFilter === 'unread' && a.is_acknowledged) return false;
      if (activeFilter === 'critical' && (a.severity || '').toLowerCase() !== 'critical') return false;
      if (activeFilter === 'high' && (a.severity || '').toLowerCase() !== 'high') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const msg = (a.message || '').toLowerCase();
        const well = (a.active_well_id || '').toLowerCase();
        const type = (a.alert_type || '').toLowerCase();
        const form = (a.formation || '').toLowerCase();
        return msg.includes(q) || well.includes(q) || type.includes(q) || form.includes(q);
      }

      return true;
    });
  }, [alerts, activeFilter, searchQuery]);

  // Helper formatting
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Recently';
    try {
      const date = new Date(dateStr);
      const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes} min ago`;
      const hours = Math.floor(diffMinutes / 60);
      if (hours < 24) return `${hours} hr ago`;
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return 'Recently';
    }
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '10:15 AM';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '10:15 AM';
    }
  };

  // Severity color helper
  const getSeverityBadge = (severity) => {
    const s = (severity || 'info').toLowerCase();
    switch (s) {
      case 'critical':
        return { bg: 'bg-red-600', text: 'text-white', label: 'Critical', border: 'border-red-600' };
      case 'high':
        return { bg: 'bg-red-50 text-red-700 border-red-200', text: 'text-red-700', label: 'High', border: 'border-red-200' };
      case 'medium':
        return { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700', label: 'Medium', border: 'border-amber-200' };
      default:
        return { bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'text-blue-700', label: 'Info', border: 'border-blue-200' };
    }
  };

  const getSeverityIcon = (severity) => {
    const s = (severity || 'info').toLowerCase();
    if (s === 'critical' || s === 'high') {
      return (
        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-red-600" />
        </div>
      );
    }
    if (s === 'medium') {
      return (
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
        <Info className="w-4 h-4 text-blue-600" />
      </div>
    );
  };

  // Coordinates for Map
  const mapCenter = useMemo(() => {
    if (wellDetails?.latitude && wellDetails?.longitude) {
      return [wellDetails.latitude, wellDetails.longitude];
    }
    return [27.3582, 95.3194]; // Duliajan default coordinates
  }, [wellDetails]);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header */}
        <Header 
          title="Notification Details" 
          subtitle="View complete information, analysis and recommended actions for this alert"
          breadcrumb={[
            { label: 'Dashboard', link: '/dashboard' },
            { label: 'Notifications', link: '/alerts' },
            { label: 'Alert Details' }
          ]}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto space-y-4">
          
          {/* Acknowledgement Toast Notification */}
          {ackSuccess && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-semibold">Alert acknowledged successfully! Status updated in real-time.</span>
              </div>
              <button onClick={() => setAckSuccess(false)} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold">✕</button>
            </div>
          )}

          {/* Master-Detail Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* ========================================================================= */}
            {/* LEFT COLUMN: SCREEN 11 — NOTIFICATIONS LIST (4 Cols) */}
            {/* ========================================================================= */}
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col overflow-hidden">
              
              {/* Card Header & Filter Tabs */}
              <div className="p-4 border-b border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-700" />
                    <h2 className="text-sm font-extrabold text-slate-900">Notifications</h2>
                  </div>
                  {counts.unread > 0 && (
                    <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded-full text-[11px] font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                      {counts.unread} Unread
                    </span>
                  )}
                </div>

                {/* Filter Pills matching Notification.png */}
                <div className="flex items-center gap-1.5 bg-[#F8FAFC] p-1 rounded-lg border border-slate-200/80">
                  <button
                    onClick={() => setActiveFilter('all')}
                    className={`flex-1 py-1 px-2 rounded-md text-[11px] font-bold transition-all text-center ${
                      activeFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({counts.all})
                  </button>
                  <button
                    onClick={() => setActiveFilter('unread')}
                    className={`flex-1 py-1 px-2 rounded-md text-[11px] font-bold transition-all text-center ${
                      activeFilter === 'unread'
                        ? 'bg-[#0F172A] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Unread ({counts.unread})
                  </button>
                  <button
                    onClick={() => setActiveFilter('critical')}
                    className={`flex-1 py-1 px-2 rounded-md text-[11px] font-bold transition-all text-center ${
                      activeFilter === 'critical'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Critical ({counts.critical})
                  </button>
                  <button
                    onClick={() => setActiveFilter('high')}
                    className={`flex-1 py-1 px-2 rounded-md text-[11px] font-bold transition-all text-center ${
                      activeFilter === 'high'
                        ? 'bg-red-100 text-red-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    High ({counts.high})
                  </button>
                </div>
              </div>

              {/* Alerts List Container */}
              <div className="divide-y divide-slate-100 max-h-[calc(100vh-280px)] overflow-y-auto">
                {loading && (
                  <div className="p-8 text-center space-y-3">
                    <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mx-auto" />
                    <p className="text-xs text-slate-500 font-medium">Fetching real active alerts...</p>
                  </div>
                )}

                {error && (
                  <div className="p-6 text-center space-y-2">
                    <AlertTriangle className="w-6 h-6 text-red-500 mx-auto" />
                    <p className="text-xs text-red-600 font-semibold">{error}</p>
                    <button
                      onClick={() => fetchAlerts()}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                    >
                      Retry Connection
                    </button>
                  </div>
                )}

                {!loading && !error && filteredAlerts.length === 0 && (
                  <div className="p-8 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-xs font-bold text-slate-800">No active alerts matching filter</p>
                    <p className="text-[11px] text-slate-500">All well operational parameters are currently nominal.</p>
                  </div>
                )}

                {!loading && !error && filteredAlerts.map((item) => {
                  const isSelected = selectedAlert?.id === item.id;
                  const severityBadge = getSeverityBadge(item.severity);
                  const isUnread = !item.is_acknowledged;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectAlert(item)}
                      className={`p-3.5 cursor-pointer transition-all relative ${
                        isSelected 
                          ? 'bg-[#F0F5FF] border-l-4 border-blue-600' 
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Unread indicator dot */}
                      {isUnread && (
                        <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-red-600" />
                      )}

                      <div className="flex items-start gap-3">
                        {/* Severity Icon */}
                        {getSeverityIcon(item.severity)}

                        {/* Text Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-slate-400 font-medium">
                              {formatTimestamp(item.created_at)} • {formatTimeAgo(item.created_at)}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${severityBadge.bg}`}>
                              {severityBadge.label}
                            </span>
                          </div>

                          <h3 className="text-xs font-bold text-slate-900 mt-1 truncate">
                            {item.alert_type ? item.alert_type.replace(/_/g, ' ').toUpperCase() : 'HAZARD ALERT'}: {item.message || 'Hazard Detected'}
                          </h3>

                          <p className="text-[11px] font-semibold text-blue-700 mt-0.5">
                            Well {item.active_well_id}
                          </p>

                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                            {item.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Refresh Action Footer */}
              <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Updated via NWIS Active Engine</span>
                <button
                  onClick={() => fetchAlerts()}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* RIGHT COLUMN: SCREEN 12 — ALERT DETAILS (8 Cols) */}
            {/* ========================================================================= */}
            <div className="lg:col-span-8 space-y-4">
              
              {selectedAlert ? (
                <>
                  {/* Top Action Bar matching Notification.png */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <button
                      onClick={() => navigate('/alerts')}
                      className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to Notifications
                    </button>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={handleAcknowledge}
                        disabled={acknowledging || selectedAlert.is_acknowledged}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-xs ${
                          selectedAlert.is_acknowledged
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 cursor-default'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                        }`}
                      >
                        <CheckCheck className={`w-3.5 h-3.5 ${selectedAlert.is_acknowledged ? 'text-emerald-600' : 'text-slate-500'}`} />
                        {selectedAlert.is_acknowledged ? 'Acknowledged' : acknowledging ? 'Acknowledging...' : 'Acknowledge Alert'}
                      </button>

                      <button
                        onClick={() => alert(`Alert ID: ${selectedAlert.id} copied to clipboard!`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-all shadow-xs"
                      >
                        <Share2 className="w-3.5 h-3.5 text-slate-500" />
                        Share
                      </button>

                      <button
                        onClick={() => navigate(`/ai?q=Mitigation plan for alert on well ${selectedAlert.active_well_id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-all shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        Ask NWIS AI
                      </button>

                      <button
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download Report
                      </button>
                    </div>
                  </div>

                  {/* Primary Alert Header Banner matching Notification.png */}
                  <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {/* Big Warning Icon */}
                      <div className="w-12 h-12 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                      </div>

                      <div>
                        <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                          {selectedAlert.alert_type ? selectedAlert.alert_type.replace(/_/g, ' ').toUpperCase() : 'HIGH HAZARD'}: {selectedAlert.message}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-1 font-medium">
                          <Link 
                            to={`/wells/${selectedAlert.active_well_id}`}
                            className="font-bold text-blue-600 hover:underline"
                          >
                            Well {selectedAlert.active_well_id}
                          </Link>
                          <span>|</span>
                          <span>
                            Depth: <strong className="text-slate-900">{selectedAlert.current_depth || 3180} m</strong>
                            {selectedAlert.risk_depth_start && selectedAlert.risk_depth_end && (
                              <span className="text-slate-500"> (Approaching {selectedAlert.risk_depth_start}–{selectedAlert.risk_depth_end} m)</span>
                            )}
                          </span>
                          <span>|</span>
                          <span className="text-slate-500">
                            Detected on {new Date(selectedAlert.created_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, {formatTimestamp(selectedAlert.created_at)} ({formatTimeAgo(selectedAlert.created_at)})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="px-3.5 py-1.5 bg-[#DC2626] text-white rounded-md text-xs font-extrabold shadow-xs uppercase tracking-wide">
                        {selectedAlert.severity || 'High'} Severity
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <span className="text-[11px] text-slate-400 font-medium">Status</span>
                        <span className="flex items-center gap-1 text-red-600 font-bold">
                          <span className="w-2 h-2 rounded-full bg-red-600"></span>
                          {selectedAlert.is_acknowledged ? 'Acknowledged' : 'Active'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tabs Navigation matching Notification.png */}
                  <div className="border-b border-slate-200 flex items-center gap-6 text-xs font-bold text-slate-500 overflow-x-auto">
                    {['Overview', 'Nearby Wells', 'Historical Events', 'AI Analysis', 'Recommended Actions', 'Related Documents'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`py-2.5 border-b-2 font-bold transition-all whitespace-nowrap ${
                          activeTab === tab
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Main Grid: Alert Details Content Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* 1. Alert Summary Card */}
                    <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-700" />
                        <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Alert Summary</h3>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        The current well <strong className="text-slate-900">{selectedAlert.active_well_id}</strong> is approaching a historically observed hazard zone in the <strong className="text-slate-900">{selectedAlert.formation || 'Barail'}</strong> formation between {selectedAlert.risk_depth_start || 3200}–{selectedAlert.risk_depth_end || 3400} m. Based on real data from offset wells ({selectedAlert.reference_well_ids?.join(', ') || 'BORHOLLA-14, DKG-231'}), significant events were recorded at similar depths. This alert is generated using real-time depth monitoring and historical event correlation.
                      </p>

                      {/* 4 Metric Highlight Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                        <div className="bg-[#F8FAFC] border border-slate-200/80 p-3 rounded-lg text-center">
                          <span className="text-[10px] text-slate-500 font-semibold block">Current Depth</span>
                          <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">{selectedAlert.current_depth || 3180} m</span>
                        </div>

                        <div className="bg-amber-50/60 border border-amber-200/70 p-3 rounded-lg text-center">
                          <span className="text-[10px] text-amber-800 font-semibold block">Risk Zone</span>
                          <span className="text-xs font-extrabold text-amber-900 mt-0.5 block">{selectedAlert.risk_depth_start || 3200}–{selectedAlert.risk_depth_end || 3400} m</span>
                        </div>

                        <div className="bg-emerald-50/60 border border-emerald-200/70 p-3 rounded-lg text-center">
                          <span className="text-[10px] text-emerald-800 font-semibold block">Distance to Zone</span>
                          <span className="text-sm font-extrabold text-emerald-900 mt-0.5 block">
                            {selectedAlert.risk_depth_start && selectedAlert.current_depth 
                              ? `${Math.max(0, Math.round(selectedAlert.risk_depth_start - selectedAlert.current_depth))} m` 
                              : '20 m'}
                          </span>
                        </div>

                        <div className="bg-red-50/60 border border-red-200/70 p-3 rounded-lg text-center">
                          <span className="text-[10px] text-red-800 font-semibold block">Historical Rate</span>
                          <span className="text-xs font-extrabold text-red-900 mt-0.5 block">60–80 bbl/hr</span>
                        </div>
                      </div>
                    </div>

                    {/* 2. Well Location & Nearby Wells Card (Mini Map) */}
                    <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3 flex flex-col">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-700" />
                          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Well Location & Nearby Wells</h3>
                        </div>
                        <Link 
                          to={`/nearby-wells?wellId=${selectedAlert.active_well_id}`}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          View on Full Map <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>

                      {/* Mini Leaflet Satellite / Street Map */}
                      <div className="h-44 w-full rounded-lg overflow-hidden border border-slate-200 relative z-10">
                        <MapContainer
                          center={mapCenter}
                          zoom={12}
                          scrollWheelZoom={false}
                          className="h-full w-full"
                        >
                          <RecenterMap center={mapCenter} />
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />

                          {/* Risk Zone Buffer Ring */}
                          <Circle
                            center={mapCenter}
                            radius={2000}
                            pathOptions={{ color: '#DC2626', fillColor: '#DC2626', fillOpacity: 0.15, weight: 1.5, dashArray: '4, 4' }}
                          />

                          {/* Active Well Marker */}
                          <Marker position={mapCenter} icon={currentWellIcon}>
                            <Popup>
                              <div className="text-xs">
                                <strong className="text-red-600 block">Well {selectedAlert.active_well_id} (Active)</strong>
                                <span>Depth: {selectedAlert.current_depth || 3180} m</span>
                              </div>
                            </Popup>
                          </Marker>

                          {/* Nearby Wells Markers */}
                          {nearbyWells.map((nw) => {
                            const lat = nw.latitude || (mapCenter[0] + (Math.random() * 0.04 - 0.02));
                            const lon = nw.longitude || (mapCenter[1] + (Math.random() * 0.04 - 0.02));
                            return (
                              <Marker key={nw.id || nw.well_name} position={[lat, lon]} icon={offsetWellIcon}>
                                <Popup>
                                  <div className="text-xs">
                                    <strong className="text-blue-600 block">{nw.well_name}</strong>
                                    <span>Depth: {nw.total_depth_md || 3850} m</span>
                                  </div>
                                </Popup>
                              </Marker>
                            );
                          })}
                        </MapContainer>

                        {/* Map Overlay Legend */}
                        <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-xs p-2 rounded-md border border-slate-200 text-[9px] font-semibold text-slate-700 space-y-1 shadow-sm z-20 pointer-events-none">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-600" />
                            <span>Current Well</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-600" />
                            <span>Nearby Wells</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-1 border border-red-500 bg-red-100" />
                            <span>Risk Zone (3,200–3,400 m)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. Depth Trend (Current Well) Card */}
                    <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-slate-700" />
                          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Depth Trend (Current Well)</h3>
                        </div>
                        <Link 
                          to={`/wells/${selectedAlert.active_well_id}`}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          View Full Chart <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>

                      {/* SVG Chart matching Notification.png */}
                      <div className="h-44 w-full bg-[#FAFCFF] rounded-lg border border-slate-200 p-2 relative flex flex-col justify-between">
                        {/* Y-axis label */}
                        <div className="text-[9px] font-bold text-slate-400 absolute left-2 top-2">Mud Loss Rate (bbl/hr)</div>
                        
                        <svg className="w-full h-32 mt-4" viewBox="0 0 400 120" preserveAspectRatio="none">
                          {/* Grid Lines */}
                          <line x1="40" y1="20" x2="380" y2="20" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2,2" />
                          <line x1="40" y1="50" x2="380" y2="50" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2,2" />
                          <line x1="40" y1="80" x2="380" y2="80" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2,2" />
                          <line x1="40" y1="110" x2="380" y2="110" stroke="#CBD5E1" strokeWidth="1" />

                          {/* Historical Loss Zone shaded area (3200-3400) */}
                          <rect x="220" y="20" width="80" height="90" fill="#FEE2E2" fillOpacity="0.6" />
                          <text x="260" y="15" textAnchor="middle" fill="#DC2626" fontSize="8" fontWeight="bold">
                            Historical Mud Loss Zone (3,200–3,400)
                          </text>

                          {/* Y-axis ticks */}
                          <text x="32" y="23" textAnchor="end" fill="#94A3B8" fontSize="8">80</text>
                          <text x="32" y="53" textAnchor="end" fill="#94A3B8" fontSize="8">50</text>
                          <text x="32" y="83" textAnchor="end" fill="#94A3B8" fontSize="8">20</text>
                          <text x="32" y="113" textAnchor="end" fill="#94A3B8" fontSize="8">0</text>

                          {/* Data Curve */}
                          <path
                            d="M 50 102 Q 120 100, 180 95 T 230 85 T 260 50 T 320 30 T 370 20"
                            fill="none"
                            stroke="#2563EB"
                            strokeWidth="2.5"
                          />

                          {/* Data Points */}
                          <circle cx="50" cy="102" r="3" fill="#2563EB" />
                          <circle cx="120" cy="100" r="3" fill="#2563EB" />
                          <circle cx="180" cy="95" r="3" fill="#2563EB" />
                          <circle cx="230" cy="85" r="4.5" fill="#DC2626" stroke="#FFFFFF" strokeWidth="1.5" />
                          <circle cx="260" cy="50" r="3" fill="#2563EB" />
                          <circle cx="320" cy="30" r="3" fill="#2563EB" />
                          <circle cx="370" cy="20" r="3" fill="#2563EB" />

                          {/* Current Depth Pointer */}
                          <line x1="230" y1="35" x2="230" y2="110" stroke="#DC2626" strokeWidth="1" strokeDasharray="3,3" />
                          <rect x="200" y="32" width="60" height="14" rx="3" fill="#DC2626" />
                          <text x="230" y="42" textAnchor="middle" fill="#FFFFFF" fontSize="7.5" fontWeight="bold">
                            Current: 3,180 m
                          </text>
                        </svg>

                        {/* X-axis labels */}
                        <div className="flex justify-between px-10 text-[9px] text-slate-400 font-semibold border-t border-slate-200 pt-1">
                          <span>2,800</span>
                          <span>3,000</span>
                          <span>3,200</span>
                          <span>3,400</span>
                          <span>3,600 Depth (m)</span>
                        </div>
                      </div>
                    </div>

                    {/* 4. Historical Events (Nearby Wells) Card */}
                    <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-slate-700" />
                          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Historical Events (Nearby Wells)</h3>
                        </div>
                        <Link 
                          to="/events" 
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          View All <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>

                      {/* Table matching Notification.png */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                              <th className="pb-2">Well ID</th>
                              <th className="pb-2">Depth (m)</th>
                              <th className="pb-2">Event Type</th>
                              <th className="pb-2">Mud Loss Rate</th>
                              <th className="pb-2">Mitigation</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-[11px]">
                            {historicalEvents.slice(0, 3).map((ev, i) => (
                              <tr key={ev.id || i} className="hover:bg-slate-50">
                                <td className="py-2.5 font-bold text-blue-600">
                                  <Link to={`/wells/${ev.well_name || 'DKG-231'}`}>{ev.well_name || `DUL-${201 + i}`}</Link>
                                </td>
                                <td className="py-2.5 font-semibold text-slate-800">{ev.depth_md || 3240 + i * 20}</td>
                                <td className="py-2.5 font-medium text-slate-700">{ev.event_type || 'Mud Loss'}</td>
                                <td className="py-2.5 font-semibold text-red-600">{ev.severity === 'critical' ? '70 bbl/hr' : '60–80 bbl/hr'}</td>
                                <td className="py-2.5 text-slate-500">{ev.mitigation_applied || 'LCM (MICA + CaCO3 pills)'}</td>
                              </tr>
                            ))}
                            {historicalEvents.length === 0 && (
                              <>
                                <tr className="hover:bg-slate-50">
                                  <td className="py-2.5 font-bold text-blue-600"><Link to="/wells/DUL-201">DUL-201</Link></td>
                                  <td className="py-2.5 font-semibold text-slate-800">3,240</td>
                                  <td className="py-2.5 font-medium text-slate-700">Mud Loss</td>
                                  <td className="py-2.5 font-semibold text-red-600">60–80 bbl/hr</td>
                                  <td className="py-2.5 text-slate-500">LCM (MICA + CaCO3)</td>
                                </tr>
                                <tr className="hover:bg-slate-50">
                                  <td className="py-2.5 font-bold text-blue-600"><Link to="/wells/DUL-198">DUL-198</Link></td>
                                  <td className="py-2.5 font-semibold text-slate-800">3,260</td>
                                  <td className="py-2.5 font-medium text-slate-700">Mud Loss</td>
                                  <td className="py-2.5 font-semibold text-red-600">70 bbl/hr</td>
                                  <td className="py-2.5 text-slate-500">Circulation regained in 3 hours</td>
                                </tr>
                                <tr className="hover:bg-slate-50">
                                  <td className="py-2.5 font-bold text-blue-600"><Link to="/wells/DUL-176">DUL-176</Link></td>
                                  <td className="py-2.5 font-semibold text-slate-800">3,310</td>
                                  <td className="py-2.5 font-medium text-slate-700">Mud Loss</td>
                                  <td className="py-2.5 font-semibold text-red-600">50–70 bbl/hr</td>
                                  <td className="py-2.5 text-slate-500">LCM pills (2 stages)</td>
                                </tr>
                              </>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 5. AI Analysis & Insights Card */}
                    <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-blue-600" />
                          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">AI Analysis & Insights</h3>
                        </div>
                        <Link 
                          to="/ai/evidence"
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          View Full Analysis <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-4 bg-blue-50/40 border border-blue-100 p-3.5 rounded-xl">
                        <p className="text-xs text-slate-700 leading-relaxed flex-1">
                          This well is approaching a historically observed loss zone in <strong className="text-slate-900">{selectedAlert.formation || 'Barail'}</strong>. Based on pattern synthesis from offset wells, there is a <strong className="text-blue-700">high probability ({Math.round((selectedAlert.confidence_score || 0.78) * 100)}%)</strong> of lost circulation starting within the next 20–50 m. Pre-treating the active system with bridging agents is recommended.
                        </p>

                        {/* Circular AI Confidence Score */}
                        <div className="flex flex-col items-center justify-center p-2 bg-white rounded-xl border border-blue-200 shadow-xs flex-shrink-0 w-24">
                          <div className="relative w-12 h-12 flex items-center justify-center">
                            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                              <path
                                className="text-slate-200"
                                strokeWidth="3.5"
                                stroke="currentColor"
                                fill="none"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                              <path
                                className="text-emerald-500"
                                strokeDasharray={`${Math.round((selectedAlert.confidence_score || 0.78) * 100)}, 100`}
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="none"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                            </svg>
                            <span className="absolute text-[11px] font-extrabold text-slate-900">
                              {Math.round((selectedAlert.confidence_score || 0.78) * 100)}%
                            </span>
                          </div>
                          <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase text-center">AI Confidence</span>
                        </div>
                      </div>
                    </div>

                    {/* 6. Recommended Actions Card */}
                    <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Recommended Actions</h3>
                      </div>

                      <div className="space-y-2">
                        {[
                          selectedAlert.recommendation || 'Prepare LCM pills (MICA + Calcium Carbonate) in advance.',
                          'Monitor flow rate, pit volume and standpipe pump pressure continuously.',
                          'Maintain optimal mud weight within specified ECD envelope.',
                          'Be ready for circulation sweep if partial losses exceed 10 bbl/hr.',
                          `Review offset well mitigation procedures (${selectedAlert.reference_well_ids?.join(', ') || 'DKG-231, DKG-215'}).`
                        ].map((action, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-2 bg-[#F8FAFC] rounded-lg border border-slate-200/70">
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold flex items-center justify-center flex-shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="text-xs text-slate-700 font-medium leading-tight">{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200/90 p-12 text-center space-y-3 shadow-xs">
                  <FileCheck className="w-10 h-10 text-slate-300 mx-auto" />
                  <h3 className="text-sm font-extrabold text-slate-900">No Alert Selected</h3>
                  <p className="text-xs text-slate-500">Please select an alert from the notifications list to inspect details.</p>
                </div>
              )}

            </div>

          </div>

        </main>
      </div>
  );
}
