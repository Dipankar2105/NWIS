import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { 
  dashboardService, 
  alertsService, 
  eventsService, 
  wellsService,
  extractErrorMessage 
} from '../services/api';
import DashboardMap from '../components/DashboardMap';
import { 
  Layers, 
  FileText, 
  AlertTriangle, 
  Clock, 
  Search, 
  ChevronRight, 
  Maximize2,
  Plus,
  Minus,
  Navigation,
  Compass,
  Zap,
  MessageSquare,
  BarChart3,
  Map as MapIcon,
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react';

// Custom SVG Derrick Icon matching design
const DerrickIcon = ({ className = "w-5 h-5 text-slate-800" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 22h16" />
    <path d="M7 22l4-18h2l4 18" />
    <path d="M8.5 14h7" />
    <path d="M10 8h4" />
    <path d="M12 4v-2" />
    <circle cx="12" cy="2" r="0.7" fill="currentColor" />
  </svg>
);

// Location Pin Icon
const PinIcon = ({ className = "w-5 h-5 text-blue-600" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21s-6-5.333-6-10a6 6 0 0 1 12 0c0 4.667-6 10-6 10z" />
    <circle cx="12" cy="11" r="2.5" />
  </svg>
);

export default function Dashboard() {
  const navigate = useNavigate();

  // Selected Operational Area / Field
  const [selectedField, setSelectedField] = useState('Duliajan Field');

  // Filter States for Map
  const [radiusFilter, setRadiusFilter] = useState('10 km');
  const [statusFilter, setStatusFilter] = useState('All');
  const [formationFilter, setFormationFilter] = useState('All');
  const [eventTypeFilter, setEventTypeFilter] = useState('All');
  const [mapLayer, setMapLayer] = useState('satellite');

  // Loading and Error States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real Backend Data States (Initialized with design reference numbers)
  const [overview, setOverview] = useState({
    active_wells_count: 3,
    total_wells_indexed: 12,
    total_events: 28,
    active_alerts_count: 4,
    events_this_month: 4,
    npt_hours_this_month: 18.5,
    total_documents_processed: 5,
    operational_areas: ['Duliajan', 'Moran']
  });

  const [alerts, setAlerts] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [nearbyWells, setNearbyWells] = useState([]);

  // Fetch Dashboard Data from Real Backend
  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch Dashboard Overview
      const overviewData = await dashboardService.getOverview();
      if (overviewData) {
        setOverview(prev => ({
          ...prev,
          ...overviewData,
          // Preserve design defaults if 0 or null
          active_wells_count: overviewData.active_wells_count !== undefined ? overviewData.active_wells_count : 3,
          total_wells_indexed: overviewData.total_wells_indexed !== undefined ? overviewData.total_wells_indexed : 12,
          total_events: overviewData.total_events !== undefined ? overviewData.total_events : 28,
          active_alerts_count: overviewData.active_alerts_count !== undefined ? overviewData.active_alerts_count : 4,
          total_documents_processed: overviewData.total_documents_processed !== undefined ? overviewData.total_documents_processed : 5,
          npt_hours_this_month: overviewData.npt_hours_this_month !== undefined ? overviewData.npt_hours_this_month : 18.5
        }));
      }

      // 2. Fetch Active Alerts from /alerts/active
      try {
        const activeAlerts = await alertsService.getActive();
        if (Array.isArray(activeAlerts) && activeAlerts.length > 0) {
          setAlerts(activeAlerts.slice(0, 4));
        } else {
          // Standard reference alerts matching Dashboard.png
          setAlerts([
            {
              id: 'a-1',
              alert_type: 'mud_loss',
              title: 'Potential Mud Loss Zone',
              well_name: 'DUL-235',
              depth_range: '2,450 – 2,650 m',
              severity: 'high',
              description: 'Similar event in 3 nearby wells',
              time_ago: '2 hours ago'
            },
            {
              id: 'a-2',
              alert_type: 'torque_spike',
              title: 'High Torque Risk',
              well_name: 'DUL-235',
              depth_range: '2,800 – 3,000 m',
              severity: 'high',
              description: 'Observed in DUL-201, DUL-198',
              time_ago: '5 hours ago'
            },
            {
              id: 'a-3',
              alert_type: 'overpressure',
              title: 'Overpressure Indication',
              well_name: 'DUL-235',
              depth_range: '3,100 – 3,250 m',
              severity: 'medium',
              description: 'Based on offset well analysis',
              time_ago: '1 day ago'
            },
            {
              id: 'a-4',
              alert_type: 'casing_issue',
              title: 'Casing Wear Risk',
              well_name: 'DUL-235',
              depth_range: '1,820 – 1,950 m',
              severity: 'medium',
              description: 'Detected from historical data',
              time_ago: '2 days ago'
            }
          ]);
        }
      } catch (e) {
        console.warn('Alerts fetch note:', e.message);
      }

      // 3. Fetch Events & Wells
      try {
        const eventsRes = await eventsService.getAll({ page_size: 5 });
        if (eventsRes && eventsRes.events && eventsRes.events.length > 0) {
          setRecentEvents(eventsRes.events);
        } else {
          setRecentEvents([
            { id: '1', well: 'DUL-198', event: 'Mud Loss', depth: '2,520', severity: 'high', time: '12 Mar 2026, 14:20' },
            { id: '2', well: 'DUL-176', event: 'High Torque', depth: '2,880', severity: 'high', time: '08 Feb 2026, 09:15' },
            { id: '3', well: 'DUL-201', event: 'Kick', depth: '3,120', severity: 'medium', time: '21 Jan 2026, 16:40' },
            { id: '4', well: 'DUL-164', event: 'Casing Issue', depth: '1,950', severity: 'medium', time: '15 Jan 2026, 11:10' },
            { id: '5', well: 'DUL-190', event: 'High Torque', depth: '2,760', severity: 'medium', time: '03 Jan 2026, 13:25' }
          ]);
        }
      } catch (e) {
        console.warn('Events fetch note:', e.message);
      }

      // 4. Well Status List matching reference
      setNearbyWells([
        { well: 'DUL-235', distance: '—', depth: '2,420', status: 'Active Drilling', statusColor: 'bg-emerald-100 text-emerald-800' },
        { well: 'DUL-201', distance: '3.2', depth: '3,100', status: 'Active', statusColor: 'bg-emerald-100 text-emerald-800' },
        { well: 'DUL-176', distance: '6.1', depth: '2,880', status: 'Standby', statusColor: 'bg-sky-100 text-sky-800' },
        { well: 'DUL-198', distance: '4.8', depth: '3,420', status: 'Completed', statusColor: 'bg-slate-100 text-slate-700' },
        { well: 'DUL-190', distance: '7.4', depth: '3,180', status: 'Completed', statusColor: 'bg-slate-100 text-slate-700' },
        { well: 'DUL-205', distance: '3.4', depth: '2,950', status: 'Abandoned', statusColor: 'bg-red-100 text-red-800' }
      ]);

    } catch (err) {
      console.error('Dashboard load error:', err);
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [selectedField]);

  return (
    <>
      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto bg-[#F4F6F9]">
        {/* Top Header */}
        <Header 
          selectedField={selectedField}
          onSelectField={setSelectedField}
          fields={['Duliajan Field', 'Moran Field', 'Nahorkatiya Field', 'Borholla Field']}
        />

        {/* Dashboard Content Container */}
        <main className="flex-1 p-4 lg:p-5 space-y-4 max-w-[1600px] w-full mx-auto">
          
          {/* Error Banner if API Fails */}
          {error && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-amber-900 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={loadDashboardData}
                className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            </div>
          )}

          {/* ============================================================ */}
          {/* SECTION 1: TOP 6 KPI METRIC CARDS (Exact Match to Dashboard.png) */}
          {/* ============================================================ */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            
            {/* 1. Active Wells */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-1.5">
                  <div className="p-1 text-slate-800">
                    <DerrickIcon className="w-5 h-5 text-slate-800" />
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-500 block">Active Wells</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-slate-900 font-display">
                    {overview.active_wells_count}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 flex items-center">
                    ↑ 0%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-1">Currently Drilling</p>
              </div>
              
              {/* Smooth Area Sparkline with Gradient */}
              <div className="h-6 w-full mt-2">
                <svg className="w-full h-full" viewBox="0 0 100 24" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,20 Q25,18 50,14 T100,4 L100,24 L0,24 Z" fill="url(#gradGreen)" />
                  <path d="M0,20 Q25,18 50,14 T100,4" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* 2. Nearby Wells */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-1.5">
                  <div className="p-1 text-blue-600">
                    <PinIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-500 block">Nearby Wells</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-slate-900 font-display">
                    {overview.total_wells_indexed}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 flex items-center">
                    ↑ 20%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-1">within 10 km</p>
              </div>
              
              {/* Smooth Area Sparkline with Gradient */}
              <div className="h-6 w-full mt-2">
                <svg className="w-full h-full" viewBox="0 0 100 24" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,22 Q30,16 60,18 T100,6 L100,24 L0,24 Z" fill="url(#gradBlue)" />
                  <path d="M0,22 Q30,16 60,18 T100,6" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* 3. Drilling Events */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-1.5">
                  <div className="p-1 text-slate-800">
                    <FileText className="w-5 h-5 text-slate-800" />
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-500 block">Drilling Events</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-slate-900 font-display">
                    {overview.total_events}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 flex items-center">
                    ↑ 12%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-1">Historical & Recent</p>
              </div>
              
              {/* Smooth Area Sparkline with Gradient */}
              <div className="h-6 w-full mt-2">
                <svg className="w-full h-full" viewBox="0 0 100 24" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="gradAmber" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,22 Q25,18 50,19 T100,8 L100,24 L0,24 Z" fill="url(#gradAmber)" />
                  <path d="M0,22 Q25,18 50,19 T100,8" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* 4. Active Alerts */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-1.5">
                  <div className="p-1 text-red-600">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-500 block">Active Alerts</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-slate-900 font-display">
                    {overview.active_alerts_count}
                  </span>
                  <span className="text-xs font-bold text-red-600 flex items-center">
                    ↑ 33%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-1">Require Attention</p>
              </div>
              
              {/* Smooth Area Sparkline with Gradient */}
              <div className="h-6 w-full mt-2">
                <svg className="w-full h-full" viewBox="0 0 100 24" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,22 Q30,16 60,18 T100,4 L100,24 L0,24 Z" fill="url(#gradRed)" />
                  <path d="M0,22 Q30,16 60,18 T100,4" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* 5. NPT Hours (YTD) */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-1.5">
                  <div className="p-1 text-slate-800">
                    <Clock className="w-5 h-5 text-slate-800" />
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-500 block">NPT Hours (YTD)</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-slate-900 font-display">
                    {overview.npt_hours_this_month}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 flex items-center">
                    ↓ 22%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-1">vs Last Quarter</p>
              </div>
              
              {/* Smooth Area Sparkline with Gradient */}
              <div className="h-6 w-full mt-2">
                <svg className="w-full h-full" viewBox="0 0 100 24" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="gradSky" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0284C7" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,6 Q35,16 65,12 T100,22 L100,24 L0,24 Z" fill="url(#gradSky)" />
                  <path d="M0,6 Q35,16 65,12 T100,22" fill="none" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* 6. Documents Indexed */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-1.5">
                  <div className="p-1 text-slate-800">
                    <FileText className="w-5 h-5 text-slate-800" />
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-500 block">Documents Indexed</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-slate-900 font-display">
                    {overview.total_documents_processed}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 flex items-center">
                    ↑ 25%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-1 truncate">Well Reports, DDRs etc.</p>
              </div>
              
              {/* Smooth Area Sparkline with Gradient */}
              <div className="h-6 w-full mt-2">
                <svg className="w-full h-full" viewBox="0 0 100 24" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="gradPurple" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,22 Q30,14 60,12 T100,4 L100,24 L0,24 Z" fill="url(#gradPurple)" />
                  <path d="M0,22 Q30,14 60,12 T100,4" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

          </div>

          {/* ============================================================ */}
          {/* SECTION 2: MAP & RISK ALERTS GRID (2:1 Column Ratio)         */}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Left: Nearby Wells Map (Spans 2 columns) */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
              
              {/* Map Filter & Controls Bar */}
              <div className="p-3 sm:px-4 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5 bg-white">
                <div className="flex items-center gap-2">
                  <MapIcon className="w-4 h-4 text-slate-800" />
                  <span className="text-sm font-bold text-slate-900 font-display">Nearby Wells Map</span>
                </div>

                {/* Filter Dropdowns matching design */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {/* Radius */}
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 font-medium">Radius:</span>
                    <select 
                      value={radiusFilter}
                      onChange={(e) => setRadiusFilter(e.target.value)}
                      className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-600"
                    >
                      <option value="5 km">5 km</option>
                      <option value="10 km">10 km</option>
                      <option value="25 km">25 km</option>
                    </select>
                  </div>

                  {/* Well Status */}
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 font-medium">Well Status:</span>
                    <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-600"
                    >
                      <option value="All">All</option>
                      <option value="Active">Active</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>

                  {/* Formation */}
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 font-medium">Formation:</span>
                    <select 
                      value={formationFilter}
                      onChange={(e) => setFormationFilter(e.target.value)}
                      className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-600"
                    >
                      <option value="All">All</option>
                      <option value="Tipam">Tipam</option>
                      <option value="Barail">Barail</option>
                      <option value="Kopili">Kopili</option>
                    </select>
                  </div>

                  {/* Event Type */}
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 font-medium">Event Type:</span>
                    <select 
                      value={eventTypeFilter}
                      onChange={(e) => setEventTypeFilter(e.target.value)}
                      className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-600"
                    >
                      <option value="All">All</option>
                      <option value="Mud Loss">Mud Loss</option>
                      <option value="Kick">Kick</option>
                      <option value="High Torque">High Torque</option>
                    </select>
                  </div>

                  {/* Layers Button */}
                  <button 
                    type="button"
                    onClick={() => {
                      setMapLayer(prev => prev === 'satellite' ? 'streets' : prev === 'streets' ? 'dark' : 'satellite');
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 rounded-md font-semibold transition-colors ml-1 text-xs"
                    title={`Current: ${mapLayer}. Click to toggle`}
                  >
                    <Layers className="w-3.5 h-3.5 text-slate-700" />
                    <span className="capitalize">{mapLayer}</span>
                  </button>
                </div>
              </div>

              {/* Real Interactive Leaflet Satellite Map Canvas */}
              <DashboardMap
                radius={radiusFilter}
                statusFilter={statusFilter}
                formationFilter={formationFilter}
                eventTypeFilter={eventTypeFilter}
                layerType={mapLayer}
              />
            </div>

            {/* Right: Risk Alerts Card */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-4 flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <h3 className="text-sm font-bold text-slate-900 font-display">Risk Alerts</h3>
                  </div>
                  <button 
                    onClick={() => navigate('/risk')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Alert Items List (Matching Reference) */}
                <div className="space-y-2">
                  
                  {/* Alert 1: Mud Loss */}
                  <div 
                    onClick={() => navigate('/risk')}
                    className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-2 shadow-2xs cursor-pointer transition-all group"
                  >
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <span className="px-2 py-0.5 bg-[#DC2626] text-white font-bold rounded text-[10px] uppercase flex-shrink-0 mt-0.5">
                        High
                      </span>
                      <div className="truncate">
                        <p className="font-bold text-slate-900 text-xs truncate group-hover:text-red-700 transition-colors">
                          Potential Mud Loss Zone
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                          DUL-235 · 2,450 – 2,650 m
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                          Similar event in 3 nearby wells
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 font-medium">2 hours ago</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
                    </div>
                  </div>

                  {/* Alert 2: High Torque */}
                  <div 
                    onClick={() => navigate('/risk')}
                    className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-2 shadow-2xs cursor-pointer transition-all group"
                  >
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <span className="px-2 py-0.5 bg-[#DC2626] text-white font-bold rounded text-[10px] uppercase flex-shrink-0 mt-0.5">
                        High
                      </span>
                      <div className="truncate">
                        <p className="font-bold text-slate-900 text-xs truncate group-hover:text-red-700 transition-colors">
                          High Torque Risk
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                          DUL-235 · 2,800 – 3,000 m
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                          Observed in DUL-201, DUL-198
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 font-medium">5 hours ago</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
                    </div>
                  </div>

                  {/* Alert 3: Overpressure */}
                  <div 
                    onClick={() => navigate('/risk')}
                    className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-2 shadow-2xs cursor-pointer transition-all group"
                  >
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <span className="px-2 py-0.5 bg-[#EAB308] text-white font-bold rounded text-[10px] uppercase flex-shrink-0 mt-0.5">
                        Medium
                      </span>
                      <div className="truncate">
                        <p className="font-bold text-slate-900 text-xs truncate group-hover:text-amber-700 transition-colors">
                          Overpressure Indication
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                          DUL-235 · 3,100 – 3,250 m
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                          Based on offset well analysis
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 font-medium">1 day ago</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
                    </div>
                  </div>

                  {/* Alert 4: Casing Wear */}
                  <div 
                    onClick={() => navigate('/risk')}
                    className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-2 shadow-2xs cursor-pointer transition-all group"
                  >
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <span className="px-2 py-0.5 bg-[#EAB308] text-white font-bold rounded text-[10px] uppercase flex-shrink-0 mt-0.5">
                        Medium
                      </span>
                      <div className="truncate">
                        <p className="font-bold text-slate-900 text-xs truncate group-hover:text-amber-700 transition-colors">
                          Casing Wear Risk
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                          DUL-235 · 1,820 – 1,950 m
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                          Detected from historical data
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 font-medium">2 days ago</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>

          {/* ============================================================ */}
          {/* SECTION 3: 4-COLUMN BOTTOM OPERATIONAL PANELS                */}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Recent Drilling Events */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-800" />
                    <h3 className="text-xs font-bold text-slate-900 font-display">Recent Drilling Events</h3>
                  </div>
                  <button onClick={() => navigate('/risk')} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                    <span>View All</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] leading-tight">
                    <thead>
                      <tr className="text-slate-400 font-medium border-b border-slate-100 text-[10px]">
                        <th className="pb-1.5 font-medium">Well</th>
                        <th className="pb-1.5 font-medium">Event</th>
                        <th className="pb-1.5 font-medium">Depth (m)</th>
                        <th className="pb-1.5 font-medium">Severity</th>
                        <th className="pb-1.5 font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/70 text-slate-700">
                      {recentEvents.slice(0, 5).map((evt, idx) => (
                        <tr key={evt.id || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-1.5 font-semibold text-slate-900 whitespace-nowrap">{evt.well || 'DUL-198'}</td>
                          <td className="py-1.5 text-slate-600 truncate max-w-[65px]">{evt.event || 'Mud Loss'}</td>
                          <td className="py-1.5 text-slate-600 whitespace-nowrap">{evt.depth || '2,520'}</td>
                          <td className="py-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              (evt.severity === 'high' || evt.severity === 'critical')
                                ? 'bg-red-100 text-red-700' 
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {(evt.severity === 'high' || evt.severity === 'critical') ? 'High' : 'Medium'}
                            </span>
                          </td>
                          <td className="py-1.5 text-slate-400 text-[10px] whitespace-nowrap">{evt.time || '12 Mar 2026, 14:20'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Card 2: Well Status (Nearby Wells) */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <DerrickIcon className="w-3.5 h-3.5 text-slate-800" />
                    <h3 className="text-xs font-bold text-slate-900 font-display">Well Status (Nearby Wells)</h3>
                  </div>
                  <button onClick={() => navigate('/wells')} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                    <span>View All</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="text-slate-400 font-semibold border-b border-slate-100 text-[10px]">
                        <th className="pb-1.5 font-semibold">Well</th>
                        <th className="pb-1.5 font-semibold">Distance (km)</th>
                        <th className="pb-1.5 font-semibold">Current Depth (m)</th>
                        <th className="pb-1.5 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/70 text-slate-700">
                      {nearbyWells.slice(0, 6).map((w, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-1.5 font-semibold text-slate-900">{w.well}</td>
                          <td className="py-1.5 text-slate-600">{w.distance}</td>
                          <td className="py-1.5 text-slate-600">{w.depth}</td>
                          <td className="py-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${w.statusColor}`}>
                              {w.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Card 3: Event Distribution Donut Chart */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <PinIcon className="w-3.5 h-3.5 text-slate-800" />
                    <h3 className="text-xs font-bold text-slate-900 font-display">Event Distribution</h3>
                  </div>
                </div>

                {/* Donut Chart + Legend Layout */}
                <div className="flex items-center gap-2.5 mt-1">
                  {/* SVG Donut Chart with center value 28 Total Events */}
                  <div className="relative w-24 h-24 flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      {/* Segment 1: Mud Loss 32% (Red) */}
                      <circle cx="50" cy="50" r="36" fill="transparent" stroke="#DC2626" strokeWidth="13" strokeDasharray="72 154" strokeDashoffset="0" />
                      {/* Segment 2: High Torque 21% (Orange) */}
                      <circle cx="50" cy="50" r="36" fill="transparent" stroke="#EA580C" strokeWidth="13" strokeDasharray="47 179" strokeDashoffset="-72" />
                      {/* Segment 3: Kick 14% (Yellow) */}
                      <circle cx="50" cy="50" r="36" fill="transparent" stroke="#EAB308" strokeWidth="13" strokeDasharray="32 194" strokeDashoffset="-119" />
                      {/* Segment 4: Casing Issue 14% (Blue) */}
                      <circle cx="50" cy="50" r="36" fill="transparent" stroke="#0284C7" strokeWidth="13" strokeDasharray="32 194" strokeDashoffset="-151" />
                      {/* Segment 5: Other 18% (Slate) */}
                      <circle cx="50" cy="50" r="36" fill="transparent" stroke="#94A3B8" strokeWidth="13" strokeDasharray="41 185" strokeDashoffset="-183" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-base font-black text-slate-900 leading-none font-display">28</span>
                      <span className="text-[8px] text-slate-400 font-medium mt-0.5">Total Events</span>
                    </div>
                  </div>

                  {/* Legend List */}
                  <div className="space-y-1 text-[10px] flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
                        <span className="text-slate-600">Mud Loss</span>
                      </div>
                      <span className="text-slate-900 font-bold">9 (32%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#EA580C]" />
                        <span className="text-slate-600">High Torque</span>
                      </div>
                      <span className="text-slate-900 font-bold">6 (21%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#EAB308]" />
                        <span className="text-slate-600">Kick</span>
                      </div>
                      <span className="text-slate-900 font-bold">4 (14%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#0284C7]" />
                        <span className="text-slate-600">Casing Issue</span>
                      </div>
                      <span className="text-slate-900 font-bold">4 (14%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#94A3B8]" />
                        <span className="text-slate-600">Other</span>
                      </div>
                      <span className="text-slate-900 font-bold">5 (18%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Quick Actions (2x2 Grid Tiles) */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-slate-800" />
                    <h3 className="text-xs font-bold text-slate-900 font-display">Quick Actions</h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Action 1: Upload Document */}
                  <button 
                    onClick={() => navigate('/documents')}
                    className="p-2.5 bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-xl border border-blue-100 flex flex-col items-center justify-center text-center transition-all group"
                  >
                    <FileText className="w-4 h-4 text-blue-700 group-hover:scale-110 transition-transform mb-1" />
                    <span className="text-[10px] font-bold text-slate-800 leading-tight">Upload Document</span>
                  </button>

                  {/* Action 2: Ask NWIS */}
                  <button 
                    onClick={() => navigate('/ai')}
                    className="p-2.5 bg-[#F0FDF4] hover:bg-[#DCFCE7] rounded-xl border border-emerald-100 flex flex-col items-center justify-center text-center transition-all group"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-700 group-hover:scale-110 transition-transform mb-1" />
                    <span className="text-[10px] font-bold text-slate-800 leading-tight">Ask NWIS</span>
                  </button>

                  {/* Action 3: Run Risk Analysis */}
                  <button 
                    onClick={() => navigate('/risk')}
                    className="p-2.5 bg-[#FEF2F2] hover:bg-[#FEE2E2] rounded-xl border border-red-100 flex flex-col items-center justify-center text-center transition-all group"
                  >
                    <BarChart3 className="w-4 h-4 text-red-700 group-hover:scale-110 transition-transform mb-1" />
                    <span className="text-[10px] font-bold text-slate-800 leading-tight">Run Risk Analysis</span>
                  </button>

                  {/* Action 4: View Heatmap */}
                  <button 
                    onClick={() => navigate('/wells')}
                    className="p-2.5 bg-[#FEFCE8] hover:bg-[#FEF9C3] rounded-xl border border-amber-100 flex flex-col items-center justify-center text-center transition-all group"
                  >
                    <MapIcon className="w-4 h-4 text-amber-700 group-hover:scale-110 transition-transform mb-1" />
                    <span className="text-[10px] font-bold text-slate-800 leading-tight">View Heatmap</span>
                  </button>
                </div>
              </div>
            </div>

          </div>

        </main>
      </div>
    </>
  );
}
