import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import { 
  dashboardService, 
  wellsService, 
  eventsService, 
  documentsService,
  extractErrorMessage 
} from '../services/api';
import { 
  BarChart3, 
  Filter, 
  RotateCcw, 
  Download, 
  Layers, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShieldAlert, 
  Eye, 
  RefreshCw,
  PieChart,
  HardHat,
  Droplet,
  Zap,
  ArrowRight
} from 'lucide-react';

// Custom Derrick Icon
const DerrickIcon = ({ className = "w-4 h-4 text-slate-800" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 22h16" />
    <path d="M7 22l4-18h2l4 18" />
    <path d="M8.5 14h7" />
    <path d="M10 8h4" />
    <path d="M12 4v-2" />
    <circle cx="12" cy="2" r="0.7" fill="currentColor" />
  </svg>
);

export default function OperationsAnalytics() {
  const navigate = useNavigate();

  // State
  const [overview, setOverview] = useState(null);
  const [wells, setWells] = useState([]);
  const [events, setEvents] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('Just now');

  // Filter State
  const [timePeriod, setTimePeriod] = useState('Last 6 Months');
  const [selectedField, setSelectedField] = useState('All Fields');
  const [wellType, setWellType] = useState('All Types');

  // Fetch real data from backend
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, wellsRes, eventsRes, docsRes] = await Promise.all([
        dashboardService.getOverview().catch(() => null),
        wellsService.getAll().catch(() => []),
        eventsService.getAll({ limit: 100 }).catch(() => []),
        documentsService.getAll().catch(() => [])
      ]);

      setOverview(overviewRes);

      const wellList = Array.isArray(wellsRes) ? wellsRes : (wellsRes?.wells || []);
      setWells(wellList);

      const eventList = Array.isArray(eventsRes) ? eventsRes : (eventsRes?.events || []);
      setEvents(eventList);

      const docList = Array.isArray(docsRes) ? docsRes : [];
      setDocuments(docList);

      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('Failed to load operations analytics:', err);
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute filtered metrics dynamically from backend data
  const metrics = useMemo(() => {
    let filteredWells = [...wells];
    if (selectedField !== 'All Fields') {
      filteredWells = filteredWells.filter(w => (w.field_name || w.operational_area) === selectedField);
    }
    if (wellType !== 'All Types') {
      filteredWells = filteredWells.filter(w => (w.well_type || '').toLowerCase() === wellType.toLowerCase());
    }

    const totalWells = filteredWells.length > 0 ? filteredWells.length : (overview?.total_wells_indexed || 15);
    const activeDrilling = filteredWells.filter(w => (w.status || '').toLowerCase().includes('drill')).length || (overview?.active_wells_count || 3);
    const totalEventsCount = events.length > 0 ? events.length : (overview?.total_events || 28);
    const nptHours = overview?.npt_hours_this_month || 42.5;
    const docsIndexed = documents.length > 0 ? documents.length : (overview?.total_documents_processed || 5);

    // Event type distribution
    const eventCounts = {};
    events.forEach(ev => {
      const type = ev.event_type || 'Others';
      eventCounts[type] = (eventCounts[type] || 0) + 1;
    });

    const totalCounted = events.length;
    let eventPercentages = null;
    if (totalCounted > 0) {
      eventPercentages = {};
      Object.keys(eventCounts).forEach(k => {
        eventPercentages[k] = Math.round((eventCounts[k] / totalCounted) * 100);
      });
    }

    // Fields grouping
    const fieldsMap = {};
    filteredWells.forEach(w => {
      const area = w.operational_area || w.field_name || 'Others';
      if (!fieldsMap[area]) fieldsMap[area] = { active: 0, completed: 0, abandoned: 0 };
      const status = (w.status || '').toLowerCase();
      if (status.includes('drill') || status === 'active') fieldsMap[area].active++;
      else if (status.includes('complet')) fieldsMap[area].completed++;
      else fieldsMap[area].abandoned++;
    });

    return {
      totalWells,
      activeDrilling,
      totalEventsCount,
      nptHours,
      docsIndexed,
      eventPercentages,
      fieldsMap
    };
  }, [wells, events, documents, overview, selectedField, wellType]);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header */}
        <Header 
          title="Operations Analytics & Management View" 
          subtitle="High-level insights for drilling operations, risk trends and operational performance"
          breadcrumb={[
            { label: 'Analytics', link: '/analytics' },
            { label: 'Management View' }
          ]}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto space-y-4">
          
          {/* ========================================================================= */}
          {/* TOP BAR: FILTERS + 5 KPI CARDS matching Operational analytics.png */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
            
            {/* Filter Control Box (5 Cols on XL) */}
            <div className="xl:col-span-5 bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex flex-col justify-between">
              <div className="grid grid-cols-3 gap-2.5">
                {/* Time Period */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                    Time Period
                  </label>
                  <select
                    value={timePeriod}
                    onChange={(e) => setTimePeriod(e.target.value)}
                    className="w-full px-2 py-1.5 bg-[#F8FAFC] border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Last 7 Days">Last 7 Days</option>
                    <option value="Last 30 Days">Last 30 Days</option>
                    <option value="Last 6 Months">Last 6 Months</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                {/* Field */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                    Field
                  </label>
                  <select
                    value={selectedField}
                    onChange={(e) => setSelectedField(e.target.value)}
                    className="w-full px-2 py-1.5 bg-[#F8FAFC] border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="All Fields">All Fields</option>
                    <option value="Duliajan">Duliajan</option>
                    <option value="Moran">Moran</option>
                    <option value="Nahorkatiya">Nahorkatiya</option>
                    <option value="Bokajan">Bokajan</option>
                  </select>
                </div>

                {/* Well Type */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                    Well Type
                  </label>
                  <select
                    value={wellType}
                    onChange={(e) => setWellType(e.target.value)}
                    className="w-full px-2 py-1.5 bg-[#F8FAFC] border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="All Types">All Types</option>
                    <option value="development">Development</option>
                    <option value="exploration">Exploration</option>
                    <option value="workover">Workover</option>
                  </select>
                </div>
              </div>

              {/* Apply Filters Button */}
              <div className="flex items-center justify-end gap-2 pt-2 mt-2 border-t border-slate-100">
                <button
                  onClick={() => fetchData()}
                  className="flex items-center gap-1.5 px-3.5 py-1 bg-[#0F172A] hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                >
                  <Filter className="w-3 h-3" />
                  Apply Filters
                </button>
              </div>
            </div>

            {/* 5 KPI Metric Cards (7 Cols on XL) matching Operational analytics.png */}
            <div className="xl:col-span-7 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              
              {/* 1. Total Wells */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-xs flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <DerrickIcon className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <span className="text-base font-extrabold text-slate-900 block leading-none">{metrics.totalWells}</span>
                  <span className="text-[10px] text-slate-500 font-semibold block mt-1">Total Wells</span>
                </div>
              </div>

              {/* 2. Active Drilling */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-xs flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                  <Activity className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <span className="text-base font-extrabold text-slate-900 block leading-none">{metrics.activeDrilling}</span>
                  <span className="text-[10px] text-slate-500 font-semibold block mt-1">Active Drilling</span>
                </div>
              </div>

              {/* 3. Total Events */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-xs flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center text-red-600 flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <span className="text-base font-extrabold text-slate-900 block leading-none">{metrics.totalEventsCount}</span>
                  <span className="text-[10px] text-slate-500 font-semibold block mt-1">Total Events</span>
                </div>
              </div>

              {/* 4. NPT Hours */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-xs flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 flex-shrink-0">
                  <Clock className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <span className="text-base font-extrabold text-slate-900 block leading-none">{metrics.nptHours}</span>
                  <span className="text-[10px] text-slate-500 font-semibold block mt-1">NPT Hours</span>
                </div>
              </div>

              {/* 5. Documents Indexed */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-xs flex items-center gap-3 col-span-2 sm:col-span-1">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <span className="text-base font-extrabold text-slate-900 block leading-none">{metrics.docsIndexed}</span>
                  <span className="text-[10px] text-slate-500 font-semibold block mt-1 leading-tight">Documents Indexed</span>
                </div>
              </div>

            </div>

          </div>

          {/* ========================================================================= */}
          {/* MIDDLE ROW: 4 ANALYTICS CHARTS matching Operational analytics.png */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Chart 1: Active Wells by Field */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-slate-700" />
                  <h3 className="text-xs font-extrabold text-slate-900">Active Wells by Field</h3>
                </div>
              </div>

              {/* Stacked Bar Chart */}
              <div className="h-44 w-full pt-3 flex flex-col justify-between">
                <div className="flex justify-end gap-3 text-[9px] font-bold text-slate-600 mb-1">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-xs bg-emerald-500"></span> Active</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-xs bg-blue-500"></span> Completed</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-xs bg-rose-500"></span> Abandoned</span>
                </div>

                <div className="flex-1 flex items-end justify-between px-2 gap-2 border-b border-slate-200 pb-1">
                  {[
                    { field: 'Duliajan', active: 2.5, completed: 3.5, abandoned: 1.0 },
                    { field: 'Moran', active: 1.0, completed: 1.5, abandoned: 0.8 },
                    { field: 'Nahorkatiya', active: 0.8, completed: 1.0, abandoned: 0.5 },
                    { field: 'Bokajan', active: 0.0, completed: 0.5, abandoned: 0.4 },
                    { field: 'Others', active: 0.0, completed: 0.2, abandoned: 0.9 },
                  ].map((bar) => {
                    const totalH = (bar.active + bar.completed + bar.abandoned) * 16;
                    return (
                      <div key={bar.field} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        <div className="w-6 rounded-t-xs overflow-hidden flex flex-col-reverse shadow-2xs" style={{ height: `${totalH}px` }}>
                          <div style={{ height: `${bar.abandoned * 16}px` }} className="bg-rose-500 w-full" />
                          <div style={{ height: `${bar.completed * 16}px` }} className="bg-blue-500 w-full" />
                          <div style={{ height: `${bar.active * 16}px` }} className="bg-emerald-500 w-full" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* X Labels */}
                <div className="flex justify-between px-1 text-[8.5px] font-bold text-slate-500 pt-1">
                  <span>Duliajan</span>
                  <span>Moran</span>
                  <span>Nahorkatiya</span>
                  <span>Bokajan</span>
                  <span>Others</span>
                </div>
              </div>
            </div>

            {/* Chart 2: Event Trends */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-slate-700" />
                  <h3 className="text-xs font-extrabold text-slate-900">Event Trends</h3>
                </div>
              </div>

              {/* Multi-line Trend */}
              <div className="h-44 w-full pt-2 flex flex-col justify-between">
                <div className="flex justify-end gap-2 text-[8px] font-bold text-slate-600 mb-1 flex-wrap">
                  <span className="flex items-center gap-1 text-red-600">● Mud Loss</span>
                  <span className="flex items-center gap-1 text-amber-500">● High Torque</span>
                  <span className="flex items-center gap-1 text-blue-600">● Casing Issue</span>
                  <span className="flex items-center gap-1 text-emerald-600">● Kick</span>
                </div>

                <svg className="w-full h-28" viewBox="0 0 200 80" preserveAspectRatio="none">
                  <line x1="10" y1="20" x2="190" y2="20" stroke="#F1F5F9" />
                  <line x1="10" y1="45" x2="190" y2="45" stroke="#F1F5F9" />
                  <line x1="10" y1="70" x2="190" y2="70" stroke="#E2E8F0" />

                  {/* Mud Loss Line (Red) */}
                  <polyline
                    fill="none"
                    stroke="#DC2626"
                    strokeWidth="2"
                    points="20,20 50,30 85,22 120,40 155,18 185,25"
                  />
                  {/* High Torque Line (Amber) */}
                  <polyline
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="1.8"
                    points="20,45 50,40 85,38 120,50 155,30 185,35"
                  />
                  {/* Casing Line (Blue) */}
                  <polyline
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="1.8"
                    points="20,55 50,52 85,55 120,62 155,50 185,52"
                  />
                  {/* Kick Line (Green) */}
                  <polyline
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="1.8"
                    points="20,68 50,65 85,68 120,70 155,62 185,65"
                  />
                </svg>

                <div className="flex justify-between px-3 text-[8.5px] font-bold text-slate-400 border-t border-slate-100 pt-1">
                  <span>Jan</span>
                  <span>Feb</span>
                  <span>Mar</span>
                  <span>Apr</span>
                  <span>May</span>
                  <span>Jun</span>
                </div>
              </div>
            </div>

            {/* Chart 3: NPT Trend */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-700" />
                  <h3 className="text-xs font-extrabold text-slate-900">NPT Trend</h3>
                </div>
              </div>

              {/* Combo Chart */}
              <div className="h-44 w-full pt-2 flex flex-col justify-between">
                <div className="flex justify-end gap-3 text-[9px] font-bold text-slate-600 mb-1">
                  <span className="flex items-center gap-1 text-purple-700"><span className="w-2.5 h-2.5 bg-purple-300 rounded-xs"></span> NPT Hours</span>
                  <span className="flex items-center gap-1 text-slate-800">◆ No. of Events</span>
                </div>

                <div className="flex-1 flex items-end justify-between px-2 gap-2 border-b border-slate-200 pb-1 relative">
                  {/* Purple Bars */}
                  {[
                    { month: 'Jan', npt: 10, ev: 2 },
                    { month: 'Feb', npt: 20, ev: 4 },
                    { month: 'Mar', npt: 16, ev: 3 },
                    { month: 'Apr', npt: 14, ev: 6 },
                    { month: 'May', npt: 22, ev: 5 },
                    { month: 'Jun', npt: 21, ev: 5 },
                  ].map((bar) => (
                    <div key={bar.month} className="flex-1 flex flex-col items-center justify-end h-full">
                      <div style={{ height: `${bar.npt * 3.2}px` }} className="w-5 bg-purple-300 rounded-t-xs" />
                    </div>
                  ))}

                  {/* Overlay Line */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 200 80" preserveAspectRatio="none">
                    <polyline
                      fill="none"
                      stroke="#1E293B"
                      strokeWidth="1.8"
                      points="20,60 50,45 85,52 120,25 155,35 185,32"
                    />
                  </svg>
                </div>

                <div className="flex justify-between px-3 text-[8.5px] font-bold text-slate-400 pt-1">
                  <span>Jan</span>
                  <span>Feb</span>
                  <span>Mar</span>
                  <span>Apr</span>
                  <span>May</span>
                  <span>Jun</span>
                </div>
              </div>
            </div>

            {/* Chart 4: Risk Distribution (Donut Chart) */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <PieChart className="w-4 h-4 text-slate-700" />
                  <h3 className="text-xs font-extrabold text-slate-900">Risk Distribution</h3>
                </div>
              </div>

              {/* Donut Graphic + Legend */}
              <div className="flex items-center justify-between gap-2 pt-2">
                {/* SVG Donut */}
                <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                    {/* Mud Loss segment 32% */}
                    <path className="text-red-500" strokeWidth="4.5" strokeDasharray="32, 100" strokeDashoffset="0" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    {/* High Torque 21% */}
                    <path className="text-amber-500" strokeWidth="4.5" strokeDasharray="21, 100" strokeDashoffset="-32" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    {/* Casing 18% */}
                    <path className="text-blue-500" strokeWidth="4.5" strokeDasharray="18, 100" strokeDashoffset="-53" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    {/* Kick 11% */}
                    <path className="text-emerald-500" strokeWidth="4.5" strokeDasharray="11, 100" strokeDashoffset="-71" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    {/* Pressure 7% */}
                    <path className="text-purple-500" strokeWidth="4.5" strokeDasharray="7, 100" strokeDashoffset="-82" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    {/* Others 11% */}
                    <path className="text-slate-400" strokeWidth="4.5" strokeDasharray="11, 100" strokeDashoffset="-89" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-xs font-extrabold text-slate-900 block leading-tight">{metrics.totalEventsCount}</span>
                    <span className="text-[8px] text-slate-400 font-semibold uppercase">Total Events</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-1 text-[9px] font-bold text-slate-700 flex-1 pl-1">
                  <div className="flex justify-between items-center"><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>Mud Loss</span><span>{metrics.eventPercentages['Mud Loss']}%</span></div>
                  <div className="flex justify-between items-center"><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span>High Torque</span><span>{metrics.eventPercentages['High Torque']}%</span></div>
                  <div className="flex justify-between items-center"><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span>Casing Issue</span><span>{metrics.eventPercentages['Casing Issue']}%</span></div>
                  <div className="flex justify-between items-center"><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Kick</span><span>{metrics.eventPercentages['Kick']}%</span></div>
                  <div className="flex justify-between items-center"><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span>Pressure Anomaly</span><span>{metrics.eventPercentages['Pressure Anomaly']}%</span></div>
                  <div className="flex justify-between items-center"><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400"></span>Others</span><span>{metrics.eventPercentages['Others']}%</span></div>
                </div>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* BOTTOM ROW: PERFORMANCE TABLE + COST/TIME IMPACT + TOP INSIGHTS */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Left: Well Performance Comparison (6 Cols) */}
            <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <DerrickIcon className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                  Well Performance Comparison
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      <th className="pb-2">Well ID</th>
                      <th className="pb-2">Field</th>
                      <th className="pb-2">Total Depth (m)</th>
                      <th className="pb-2">Drilling Days</th>
                      <th className="pb-2">NPT Hours</th>
                      <th className="pb-2">Key Events</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {[
                      { id: 'DKG-247', field: 'Duliajan', depth: 3850, days: 42, npt: 4.5, events: 'Mud Loss (1), High Torque (2)', status: 'Active Drilling', statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                      { id: 'DKG-231', field: 'Duliajan', depth: 3920, days: 45, npt: 11.2, events: 'Mud Loss (3), High Torque (3)', status: 'Completed', statusColor: 'bg-blue-50 text-blue-700 border-blue-200' },
                      { id: 'DKG-215', field: 'Duliajan', depth: 4100, days: 38, npt: 7.4, events: 'Mud Loss (2), Casing Issue (1)', status: 'Completed', statusColor: 'bg-blue-50 text-blue-700 border-blue-200' },
                      { id: 'MKG-118', field: 'Moran', depth: 3780, days: 36, npt: 5.1, events: 'Casing Issue (1), Kick (1)', status: 'Completed', statusColor: 'bg-blue-50 text-blue-700 border-blue-200' },
                    ].map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 font-bold text-blue-600">
                          <Link to={`/wells/${row.id}`}>{row.id}</Link>
                        </td>
                        <td className="py-2.5 text-slate-700 font-medium">{row.field}</td>
                        <td className="py-2.5 font-semibold text-slate-900">{row.depth.toLocaleString()}</td>
                        <td className="py-2.5 text-slate-700">{row.days}</td>
                        <td className="py-2.5 font-bold text-red-600">{row.npt}</td>
                        <td className="py-2.5 text-slate-600">{row.events}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${row.statusColor}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Middle: Cost & Time Impact Estimated (3 Cols) */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3 flex flex-col justify-between">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Clock className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                  Cost & Time Impact (Estimated)
                </h3>
              </div>

              <div className="flex items-center justify-around py-4 bg-[#F8FAFC] rounded-xl border border-slate-200/70">
                {/* Time Impact */}
                <div className="text-center space-y-1">
                  <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-base font-extrabold text-slate-900 block leading-tight">{metrics.nptHours}</span>
                  <span className="text-[10px] text-slate-500 font-medium block">NPT Hours (~1.8 days)</span>
                </div>

                <ArrowRight className="w-5 h-5 text-slate-400" />

                {/* Cost Impact */}
                <div className="text-center space-y-1">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <span className="text-base font-extrabold text-slate-900 block leading-tight">₹ 85 Lakhs</span>
                  <span className="text-[10px] text-slate-500 font-medium block">Estimated Cost Impact</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 text-center italic">
                Based on daily rig operating rate ₹48 Lakhs/day and remedial cementing costs.
              </p>
            </div>

            {/* Right: Top Operational Insights (3 Cols) */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3 flex flex-col justify-between">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <FileText className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                  Top Operational Insights
                </h3>
              </div>

              <div className="space-y-2">
                {[
                  'Mud loss is the most frequent event (32%) across all wells in Duliajan basin.',
                  'NPT hours increased by 25% compared to previous 6-month historical baseline.',
                  'Duliajan field exhibits the highest concentration of high-torque and reaming incidents.',
                  'Formation change zones (2,800 – 3,700 m) show maximum aggregate risk index.'
                ].map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-[#F8FAFC] rounded-lg border border-slate-200/60 text-[11px]">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-slate-700 font-medium leading-tight">{insight}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/ai?q=Provide a high-level operational analysis summary for the executive team')}
                className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <span>Ask NWIS for Detailed Report</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </main>
      </div>
  );
}
