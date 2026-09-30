import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import { 
  eventsService, 
  wellsService, 
  dashboardService,
  extractErrorMessage,
  exportService
} from '../services/api';
import { useToast } from '../context/ToastContext';
import { 
  Layers, 
  FileText, 
  AlertTriangle, 
  Clock, 
  Search, 
  ChevronRight, 
  Download, 
  ExternalLink, 
  Calendar, 
  Filter, 
  RotateCcw, 
  X, 
  Eye, 
  Bot, 
  BarChart3, 
  MapPin, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  File,
  HardHat,
  Droplet,
  Flame,
  Zap
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

// Location Pin Icon
const PinIcon = ({ className = "w-4 h-4 text-amber-500" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21s-6-5.333-6-10a6 6 0 0 1 12 0c0 4.667-6 10-6 10z" />
    <circle cx="12" cy="11" r="2.5" />
  </svg>
);

export default function Events() {
  const navigate = useNavigate();
  const toast = useToast();

  const [selectedField, setSelectedField] = useState('Duliajan Field');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add Event Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEvent, setNewEvent] = useState({
    well_id: 'DUL-235',
    event_type: 'Mud Loss',
    severity: 'High',
    depth_md: '',
    formation: 'Barail',
    description: '',
    npt_hours: '',
    cost_impact: ''
  });

  // Handle new event form submission
  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.well_id || !newEvent.event_type || !newEvent.description.trim()) {
      toast.warning('Validation', 'Please fill in Well ID, Event Type and Description.');
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await eventsService.create({
        ...newEvent,
        depth_md: newEvent.depth_md ? parseFloat(newEvent.depth_md) : null,
        npt_hours: newEvent.npt_hours ? parseFloat(newEvent.npt_hours) : 0,
        cost_impact: newEvent.cost_impact ? parseFloat(newEvent.cost_impact) : 0
      });
      // Prepend to local events list
      const newRow = {
        id: created.id || `EVT-${Date.now()}`,
        well_id: created.well_name || created.well_id || newEvent.well_id,
        event_type: created.event_type || newEvent.event_type,
        depth: created.depth_md || (newEvent.depth_md ? parseFloat(newEvent.depth_md) : 0),
        formation: created.formation || newEvent.formation,
        severity: created.severity ? created.severity.charAt(0) + created.severity.slice(1).toLowerCase() : newEvent.severity,
        date_time: new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        status: 'Indexed',
        description: created.description || newEvent.description,
        npt_hours: created.npt_hours || 0,
        recurrence: 1,
        affected_wells: [],
        documents: []
      };
      setEventsList(prev => [newRow, ...prev]);
      setSelectedEvent(newRow);
      toast.success('Event Logged', `${newEvent.event_type} for ${newEvent.well_id} has been recorded.`);
      setShowAddModal(false);
      setNewEvent({ well_id: 'DUL-235', event_type: 'Mud Loss', severity: 'High', depth_md: '', formation: 'Barail', description: '', npt_hours: '', cost_impact: '' });
    } catch (err) {
      toast.error('Failed to Log Event', extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filters State matching events and incidents.png
  const [wellFilter, setWellFilter] = useState('All Wells');
  const [eventTypeFilter, setEventTypeFilter] = useState('All Event Types');
  const [severityFilter, setSeverityFilter] = useState('All Severities');
  const [formationFilter, setFormationFilter] = useState('All Formations');
  const [depthFrom, setDepthFrom] = useState('');
  const [depthTo, setDepthTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');

  // Master Events Dataset
  const defaultEvents = [
    {
      id: 'EVT-001',
      well_id: 'DUL-201',
      event_type: 'Mud Loss',
      depth: 3240,
      formation: 'Barail',
      severity: 'High',
      date_time: '12 Jan 2026, 14:20',
      status: 'Indexed',
      description: 'Severe mud loss observed while drilling through Barail formation at around 3,240 m. Losses estimated at 60-80 bbl/hr. Circulation partially regained after LCM treatment.',
      npt_hours: 11.2,
      recurrence: 3,
      affected_wells: ['DUL-205', 'DUL-198', 'DUL-176'],
      documents: [
        { name: 'DUL-201_Daily_Drilling_Report.pdf', type: 'DDR' },
        { name: 'DUL-201_Mud_Log.pdf', type: 'Mud Log' },
        { name: 'DUL-201_Well_Report.pdf', type: 'Well Report' }
      ]
    },
    {
      id: 'EVT-002',
      well_id: 'DUL-205',
      event_type: 'High Torque',
      depth: 3580,
      formation: 'Barail',
      severity: 'High',
      date_time: '08 Feb 2026, 09:15',
      status: 'Indexed',
      description: 'Significant torque increase, possible formation change from sand to hard shale. Surface torque peaked at 32 kN-m.',
      npt_hours: 8.5,
      recurrence: 2,
      affected_wells: ['DUL-201', 'DUL-190'],
      documents: [
        { name: 'DUL-205_Daily_Drilling_Report.pdf', type: 'DDR' },
        { name: 'DUL-205_Mud_Log.pdf', type: 'Mud Log' }
      ]
    },
    {
      id: 'EVT-003',
      well_id: 'DUL-198',
      event_type: 'Casing Issue',
      depth: 2950,
      formation: 'Tipam',
      severity: 'Medium',
      date_time: '21 Jan 2026, 16:40',
      status: 'Indexed',
      description: 'Casing wear indication from caliper logs during 9-5/8" casing run. Minor drag observed.',
      npt_hours: 4.2,
      recurrence: 1,
      affected_wells: ['DUL-176'],
      documents: [
        { name: 'DUL-198_Casing_Report.pdf', type: 'Casing' }
      ]
    },
    {
      id: 'EVT-004',
      well_id: 'DUL-176',
      event_type: 'Kick',
      depth: 3120,
      formation: 'Barail',
      severity: 'Medium',
      date_time: '15 Jan 2026, 11:10',
      status: 'Indexed',
      description: 'Kick indication from flow increase. Pit gain of 12 bbl recorded. Well shut in and killed with 1.22 SG mud.',
      npt_hours: 14.0,
      recurrence: 2,
      affected_wells: ['DUL-201', 'DUL-205'],
      documents: [
        { name: 'DUL-176_Well_Control_Report.pdf', type: 'Well Control' }
      ]
    },
    {
      id: 'EVT-005',
      well_id: 'DUL-190',
      event_type: 'Lost Circulation',
      depth: 2760,
      formation: 'Barail',
      severity: 'Low',
      date_time: '03 Jan 2026, 13:25',
      status: 'Indexed',
      description: 'Minor losses, managed with LCM pills. 15 bbl total fluid loss before recovery.',
      npt_hours: 2.0,
      recurrence: 4,
      affected_wells: ['DUL-198'],
      documents: [
        { name: 'DUL-190_DDR.pdf', type: 'DDR' }
      ]
    },
    {
      id: 'EVT-006',
      well_id: 'DUL-164',
      event_type: 'Pressure Anomaly',
      depth: 3420,
      formation: 'Girujan',
      severity: 'High',
      date_time: '28 Dec 2025, 10:30',
      status: 'Indexed',
      description: 'Unexpected pressure spike observed in Girujan clay section. Standpipe pressure jumped 3.5 MPa.',
      npt_hours: 6.8,
      recurrence: 1,
      affected_wells: ['DUL-205'],
      documents: [
        { name: 'DUL-164_Daily_Report.pdf', type: 'DDR' }
      ]
    },
    {
      id: 'EVT-007',
      well_id: 'DUL-201',
      event_type: 'High Torque',
      depth: 3100,
      formation: 'Barail',
      severity: 'Medium',
      date_time: '18 Dec 2025, 09:45',
      status: 'Indexed',
      description: 'Torque increase while drilling. Rotary speed reduced to 80 RPM to mitigate vibration.',
      npt_hours: 3.5,
      recurrence: 3,
      affected_wells: ['DUL-205', 'DUL-176'],
      documents: [
        { name: 'DUL-201_Mud_Log.pdf', type: 'Mud Log' }
      ]
    },
    {
      id: 'EVT-008',
      well_id: 'DUL-205',
      event_type: 'Mud Loss',
      depth: 3200,
      formation: 'Barail',
      severity: 'High',
      date_time: '10 Dec 2025, 15:20',
      status: 'Indexed',
      description: 'Seepage losses in porous Barail sandstone. High filter cake build-up.',
      npt_hours: 9.0,
      recurrence: 3,
      affected_wells: ['DUL-201'],
      documents: [
        { name: 'DUL-205_Daily_Drilling_Report.pdf', type: 'DDR' }
      ]
    },
    {
      id: 'EVT-009',
      well_id: 'DUL-198',
      event_type: 'Lost Circulation',
      depth: 2480,
      formation: 'Tipam',
      severity: 'Low',
      date_time: '05 Dec 2025, 12:10',
      status: 'Indexed',
      description: 'Minor mud loss, stabilized with standard nut plug and mica LCM blend.',
      npt_hours: 1.5,
      recurrence: 2,
      affected_wells: ['DUL-190'],
      documents: [
        { name: 'DUL-198_DDR.pdf', type: 'DDR' }
      ]
    },
    {
      id: 'EVT-010',
      well_id: 'DUL-176',
      event_type: 'Casing Issue',
      depth: 2920,
      formation: 'Barail',
      severity: 'Medium',
      date_time: '01 Dec 2025, 17:30',
      status: 'Indexed',
      description: 'Tight hole condition encountered while pulling out of hole before casing shoe run.',
      npt_hours: 5.0,
      recurrence: 1,
      affected_wells: ['DUL-198'],
      documents: [
        { name: 'DUL-176_Well_Report.pdf', type: 'Well Report' }
      ]
    }
  ];

  const [eventsList, setEventsList] = useState(defaultEvents);
  const [selectedEvent, setSelectedEvent] = useState(defaultEvents[0]);

  // Load Real Events from Backend
  const loadEvents = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = {};
      if (wellFilter !== 'All Wells') params.well_id = wellFilter;
      if (eventTypeFilter !== 'All Event Types') params.event_type = eventTypeFilter;
      if (severityFilter !== 'All Severities') params.severity = severityFilter.toLowerCase();
      if (formationFilter !== 'All Formations') params.formation = formationFilter;

      const res = await eventsService.getAll(params);
      if (res && Array.isArray(res.events) && res.events.length > 0) {
        setEventsList(res.events.map((ev, idx) => ({
          id: ev.id || `EVT-00${idx + 1}`,
          well_id: ev.well_name || ev.well_id || 'DUL-201',
          event_type: ev.event_type || 'Mud Loss',
          depth: ev.depth || 3240,
          formation: ev.formation || 'Barail',
          severity: ev.severity ? (ev.severity.charAt(0).toUpperCase() + ev.severity.slice(1)) : 'High',
          date_time: ev.timestamp || '12 Jan 2026, 14:20',
          status: 'Indexed',
          description: ev.description || 'Drilling anomaly documented during operation.',
          npt_hours: ev.npt_hours || 11.2,
          recurrence: 3,
          affected_wells: ['DUL-205', 'DUL-198', 'DUL-176'],
          documents: [
            { name: `${ev.well_name || 'DUL-201'}_Daily_Drilling_Report.pdf`, type: 'DDR' }
          ]
        })));
      }
    } catch (err) {
      console.warn('Events API fetch fallback note:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [wellFilter, eventTypeFilter, severityFilter, formationFilter]);

  // Filtered dataset based on UI filter state
  const filteredEvents = eventsList.filter((evt) => {
    if (wellFilter !== 'All Wells' && evt.well_id !== wellFilter) return false;
    if (eventTypeFilter !== 'All Event Types' && evt.event_type !== eventTypeFilter) return false;
    if (severityFilter !== 'All Severities' && evt.severity !== severityFilter) return false;
    if (formationFilter !== 'All Formations' && evt.formation !== formationFilter) return false;
    if (depthFrom && evt.depth < parseInt(depthFrom, 10)) return false;
    if (depthTo && evt.depth > parseInt(depthTo, 10)) return false;
    return true;
  });

  // Export events as CSV
  const handleExport = useCallback(() => {
    const headers = ['id', 'well_id', 'event_type', 'depth', 'formation', 'severity', 'date_time', 'npt_hours', 'description'];
    const blob = exportService.generateCSVBlob(headers, filteredEvents);
    exportService.downloadBlob(blob, `nwis_events_${new Date().toISOString().slice(0,10)}.csv`);
    toast.success('Export Complete', `${filteredEvents.length} events exported to CSV.`);
  }, [filteredEvents, toast]);

  const handleResetFilters = () => {
    setWellFilter('All Wells');
    setEventTypeFilter('All Event Types');
    setSeverityFilter('All Severities');
    setFormationFilter('All Formations');
    setDepthFrom('');
    setDepthTo('');
    setStatusFilter('All Statuses');
  };

  return (
    <>
      {/* Left Navigation Sidebar */}

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* Top Header matching events and incidents.png */}
        <Header 
          title="Events & Incident Intelligence"
          subtitle="Search, investigate and learn from historical drilling events"
          breadcrumb={[
            { label: 'Risk & Events', link: '/risk' },
            { label: 'Event History' }
          ]}
          selectedField={selectedField}
          onSelectField={setSelectedField}
          fields={['Duliajan Field', 'Moran Field', 'Nahorkatiya Field', 'Borholla Field']}
        />

        {/* Events Workspace Content */}
        <main className="flex-1 p-4 lg:p-5 space-y-4 max-w-[1650px] w-full mx-auto">
          
          {/* ============================================================ */}
          {/* SECTION 1: FILTER BAR (Matching events and incidents.png)     */}
          {/* ============================================================ */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              
              {/* Filter Controls Group */}
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                
                {/* 1. Well Filter */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-bold">Well</span>
                  <select
                    value={wellFilter}
                    onChange={(e) => setWellFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-600"
                  >
                    <option value="All Wells">All Wells</option>
                    <option value="DUL-201">DUL-201</option>
                    <option value="DUL-205">DUL-205</option>
                    <option value="DUL-198">DUL-198</option>
                    <option value="DUL-176">DUL-176</option>
                    <option value="DUL-190">DUL-190</option>
                    <option value="DUL-164">DUL-164</option>
                  </select>
                </div>

                {/* 2. Event Type Filter */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-bold">Event Type</span>
                  <select
                    value={eventTypeFilter}
                    onChange={(e) => setEventTypeFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-600"
                  >
                    <option value="All Event Types">All Event Types</option>
                    <option value="Mud Loss">Mud Loss</option>
                    <option value="High Torque">High Torque</option>
                    <option value="Casing Issue">Casing Issue</option>
                    <option value="Kick">Kick</option>
                    <option value="Lost Circulation">Lost Circulation</option>
                    <option value="Pressure Anomaly">Pressure Anomaly</option>
                  </select>
                </div>

                {/* 3. Severity Filter */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-bold">Severity</span>
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-600"
                  >
                    <option value="All Severities">All Severities</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                {/* 4. Formation Filter */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-bold">Formation</span>
                  <select
                    value={formationFilter}
                    onChange={(e) => setFormationFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-600"
                  >
                    <option value="All Formations">All Formations</option>
                    <option value="Barail">Barail</option>
                    <option value="Tipam">Tipam</option>
                    <option value="Girujan">Girujan</option>
                    <option value="Kopili/Shale">Kopili/Shale</option>
                  </select>
                </div>

                {/* 5. Depth Range */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-bold">Depth Range (m)</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      placeholder="From"
                      value={depthFrom}
                      onChange={(e) => setDepthFrom(e.target.value)}
                      className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                    <span className="text-slate-400">-</span>
                    <input
                      type="number"
                      placeholder="To"
                      value={depthTo}
                      onChange={(e) => setDepthTo(e.target.value)}
                      className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                  </div>
                </div>

                {/* 6. Date Range */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-bold">Date Range</span>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Select date range</span>
                  </div>
                </div>

                {/* 7. Status */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-bold">Status</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-600"
                  >
                    <option value="All Statuses">All Statuses</option>
                    <option value="Indexed">Indexed</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 sm:pt-0">
                <button
                  onClick={loadEvents}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Apply Filters</span>
                </button>
                <button
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  Reset
                </button>
              </div>

            </div>
          </div>

          {/* ============================================================ */}
          {/* SECTION 2: TOP 5 KPI METRIC CARDS (Exact match to reference) */}
          {/* ============================================================ */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            
            {/* 1. Total Events */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-800">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block">Total Events</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-black text-slate-900 font-display">28</span>
                    <span className="text-[10px] font-bold text-emerald-600">↑ 12%</span>
                  </div>
                  <span className="text-[9px] text-slate-400">from previous period</span>
                </div>
              </div>
            </div>

            {/* 2. High Severity */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-lg text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block">High Severity</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-black text-slate-900 font-display">9</span>
                    <span className="text-[10px] font-bold text-red-600">↑ 29%</span>
                  </div>
                  <span className="text-[9px] text-slate-400">from previous period</span>
                </div>
              </div>
            </div>

            {/* 3. Medium Severity */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                  <PinIcon className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block">Medium Severity</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-black text-slate-900 font-display">11</span>
                    <span className="text-[10px] font-bold text-emerald-600">↑ 10%</span>
                  </div>
                  <span className="text-[9px] text-slate-400">from previous period</span>
                </div>
              </div>
            </div>

            {/* 4. Low Severity */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block">Low Severity</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-black text-slate-900 font-display">6</span>
                    <span className="text-[10px] font-bold text-emerald-600">↓ 14%</span>
                  </div>
                  <span className="text-[9px] text-slate-400">from previous period</span>
                </div>
              </div>
            </div>

            {/* 5. Wells Affected */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-800">
                  <DerrickIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block">Wells Affected</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-black text-slate-900 font-display">12</span>
                    <span className="text-[10px] font-bold text-emerald-600">↑ 20%</span>
                  </div>
                  <span className="text-[9px] text-slate-400">with historical events</span>
                </div>
              </div>
            </div>

          </div>

          {/* ============================================================ */}
          {/* SECTION 3: 3-COLUMN MAIN WORKSPACE (Timeline + Table + Detail)*/}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Left Column (3.5 cols): Chronological Event Timeline & Monthly Trends */}
            <div className="lg:col-span-3 space-y-4 flex flex-col">
              
              {/* Event Timeline Card */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-800" />
                      <h3 className="text-xs font-bold text-slate-900 font-display">
                        Event Timeline (Chronological View)
                      </h3>
                    </div>
                    <button className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                      <span>View All</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Vertical Timeline Items List */}
                  <div className="space-y-3 relative before:absolute before:left-[108px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                    {defaultEvents.slice(0, 8).map((ev) => (
                      <div 
                        key={ev.id} 
                        onClick={() => setSelectedEvent(ev)}
                        className={`flex items-start gap-3 cursor-pointer p-1.5 rounded-lg transition-colors ${
                          selectedEvent?.id === ev.id ? 'bg-slate-100/80 ring-1 ring-slate-300' : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* Timestamp & Depth */}
                        <div className="w-20 text-right flex-shrink-0">
                          <p className="text-[10px] font-bold text-slate-900">{ev.date_time.split(',')[0]}</p>
                          <p className="text-[9px] font-medium text-slate-400">{ev.depth.toLocaleString()} m</p>
                        </div>

                        {/* Node Bullet Dot */}
                        <div className="relative z-10 flex-shrink-0 mt-1">
                          <span className={`w-2.5 h-2.5 rounded-full block ring-2 ring-white shadow-2xs ${
                            ev.severity === 'High' ? 'bg-red-600' :
                            ev.severity === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-extrabold text-slate-900 truncate font-display">
                              {ev.event_type}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                              ev.severity === 'High' ? 'bg-red-100 text-red-700' :
                              ev.severity === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {ev.severity}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                            {ev.well_id} · {ev.formation}
                          </p>
                          <p className="text-[9px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                            {ev.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Sub-Chart: Event Trends Stacked Bars */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-900 font-display">Event Trends</span>
                    <select className="text-[10px] font-medium bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700">
                      <option>Monthly</option>
                      <option>Quarterly</option>
                    </select>
                  </div>

                  {/* Mini Stacked Bar Chart */}
                  <div className="h-20 w-full flex items-end justify-between gap-1.5 px-1 pt-2">
                    {[
                      { m: 'Jan', h: 4, m_val: 3, l: 2 },
                      { m: 'Feb', h: 3, m_val: 4, l: 3 },
                      { m: 'Mar', h: 2, m_val: 2, l: 1 },
                      { m: 'Apr', h: 3, m_val: 3, l: 2 },
                      { m: 'May', h: 2, m_val: 4, l: 1 },
                      { m: 'Jun', h: 5, m_val: 3, l: 2 },
                      { m: 'Jul', h: 3, m_val: 2, l: 2 },
                      { m: 'Aug', h: 2, m_val: 3, l: 1 },
                      { m: 'Sep', h: 2, m_val: 2, l: 2 }
                    ].map((bar, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
                        <div className="w-full rounded-t overflow-hidden flex flex-col justify-end" style={{ height: `${(bar.h + bar.m_val + bar.l) * 7}%` }}>
                          <div className="bg-red-500 w-full" style={{ height: `${bar.h * 10}px` }} />
                          <div className="bg-amber-400 w-full" style={{ height: `${bar.m_val * 8}px` }} />
                          <div className="bg-emerald-500 w-full" style={{ height: `${bar.l * 6}px` }} />
                        </div>
                        <span className="text-[8px] text-slate-400 font-medium">{bar.m}</span>
                      </div>
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-3 text-[9px] text-slate-500 mt-1.5">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> High</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Medium</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Low</span>
                  </div>
                </div>

              </div>

            </div>

            {/* Middle Column (5.5 cols): Event Intelligence Table & Distribution */}
            <div className="lg:col-span-5 space-y-4 flex flex-col">
              
              {/* Event Intelligence Table Card */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-800" />
                      <h3 className="text-xs font-bold text-slate-900 font-display">
                        Event Intelligence ({filteredEvents.length} events)
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleExport}
                        className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-bold transition-colors"
                        title="Export events to CSV"
                      >
                        <Download className="w-3 h-3" />
                        <span>Export CSV</span>
                      </button>
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-red-700 hover:bg-red-800 text-white rounded-md text-[10px] font-bold transition-colors"
                        title="Log new drilling event"
                      >
                        <span>+ Log Event</span>
                      </button>
                    </div>
                  </div>

                  {/* Interactive Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] leading-tight">
                      <thead>
                        <tr className="text-slate-400 font-medium border-b border-slate-100 text-[10px]">
                          <th className="pb-1.5 font-medium">Well ID</th>
                          <th className="pb-1.5 font-medium">Event Type</th>
                          <th className="pb-1.5 font-medium">Depth (m)</th>
                          <th className="pb-1.5 font-medium">Formation</th>
                          <th className="pb-1.5 font-medium">Severity</th>
                          <th className="pb-1.5 font-medium">Date & Time</th>
                          <th className="pb-1.5 font-medium text-center">Evidence</th>
                          <th className="pb-1.5 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/70 text-slate-700">
                        {filteredEvents.map((evt) => (
                          <tr 
                            key={evt.id} 
                            onClick={() => setSelectedEvent(evt)}
                            className={`cursor-pointer transition-colors ${
                              selectedEvent?.id === evt.id ? 'bg-blue-50/70 font-semibold' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-2">
                              <span 
                                onClick={(e) => { e.stopPropagation(); navigate(`/wells/${evt.well_id}`); }}
                                className="font-bold text-blue-600 hover:underline cursor-pointer"
                              >
                                {evt.well_id}
                              </span>
                            </td>
                            <td className="py-2 font-medium text-slate-800 truncate max-w-[90px]">{evt.event_type}</td>
                            <td className="py-2 text-slate-600 font-mono text-[10px]">{evt.depth.toLocaleString()}</td>
                            <td className="py-2 text-slate-600">{evt.formation}</td>
                            <td className="py-2">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                evt.severity === 'High' ? 'bg-red-100 text-red-700' :
                                evt.severity === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {evt.severity}
                              </span>
                            </td>
                            <td className="py-2 text-slate-400 text-[10px] whitespace-nowrap">{evt.date_time}</td>
                            <td className="py-2 text-center">
                              <FileText className="w-3.5 h-3.5 text-red-600 mx-auto" />
                            </td>
                            <td className="py-2">
                              <span className="px-1.5 py-0.5 bg-[#DCFCE7] text-[#166534] rounded text-[9px] font-bold">
                                {evt.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Event Distribution Donut & NWIS Insight Panel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Event Distribution Donut Card */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 pb-1.5 border-b border-slate-100 mb-2">
                      <FileText className="w-3.5 h-3.5 text-slate-800" />
                      <h4 className="text-[11px] font-bold text-slate-900 font-display">Event Distribution</h4>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {/* Donut Chart */}
                      <div className="relative w-20 h-20 flex-shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="36" fill="transparent" stroke="#DC2626" strokeWidth="13" strokeDasharray="72 154" strokeDashoffset="0" />
                          <circle cx="50" cy="50" r="36" fill="transparent" stroke="#EA580C" strokeWidth="13" strokeDasharray="47 179" strokeDashoffset="-72" />
                          <circle cx="50" cy="50" r="36" fill="transparent" stroke="#EAB308" strokeWidth="13" strokeDasharray="32 194" strokeDashoffset="-119" />
                          <circle cx="50" cy="50" r="36" fill="transparent" stroke="#0284C7" strokeWidth="13" strokeDasharray="32 194" strokeDashoffset="-151" />
                          <circle cx="50" cy="50" r="36" fill="transparent" stroke="#8B5CF6" strokeWidth="13" strokeDasharray="25 201" strokeDashoffset="-183" />
                          <circle cx="50" cy="50" r="36" fill="transparent" stroke="#94A3B8" strokeWidth="13" strokeDasharray="16 210" strokeDashoffset="-208" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-sm font-black text-slate-900 leading-none font-display">28</span>
                          <span className="text-[7px] text-slate-400 font-medium mt-0.5">Total Events</span>
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="space-y-0.5 text-[9px] flex-1">
                        <div className="flex items-center justify-between"><span className="text-slate-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />Mud Loss</span><span className="font-bold">9 (32%)</span></div>
                        <div className="flex items-center justify-between"><span className="text-slate-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#EA580C]" />High Torque</span><span className="font-bold">6 (21%)</span></div>
                        <div className="flex items-center justify-between"><span className="text-slate-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#EAB308]" />Kick</span><span className="font-bold">4 (14%)</span></div>
                        <div className="flex items-center justify-between"><span className="text-slate-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#0284C7]" />Casing Issue</span><span className="font-bold">4 (14%)</span></div>
                        <div className="flex items-center justify-between"><span className="text-slate-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />Pressure Anomaly</span><span className="font-bold">3 (11%)</span></div>
                        <div className="flex items-center justify-between"><span className="text-slate-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" />Other</span><span className="font-bold">2 (7%)</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* NWIS Insight Card */}
                <div className="bg-[#F0FDF4] border border-emerald-200/80 rounded-xl p-3 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-1 mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-[#0A1322] text-white flex items-center justify-center">
                          <Bot className="w-2.5 h-2.5 text-white" />
                        </div>
                        <span className="text-[11px] font-black text-slate-900 font-display">NWIS Insight</span>
                      </div>
                      <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">Prototype Intelligence</span>
                    </div>
                    <p className="text-[10px] text-slate-700 leading-tight">
                      Mud loss events show a moderate to high likelihood in the depth range 3,200 - 3,400 m based on 3 similar events in nearby wells (DUL-201, DUL-205, DUL-198). Recommend reviewing offset well reports and mud program adjustments before approaching this interval.
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-1 text-[9px] text-slate-500 mt-1">
                    <span>📄 3 supporting documents</span>
                    <button onClick={() => navigate('/ai')} className="text-blue-600 font-bold hover:underline flex items-center gap-0.5">
                      <span>View Details</span>
                      <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>

              </div>

            </div>

            {/* Right Column (3.5 cols): Selected Event Detail Panel matching design */}
            <div className="lg:col-span-4">
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between h-full">
                
                <div>
                  {/* Header */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Droplet className="w-4 h-4 text-slate-800" />
                      <h3 className="text-xs font-bold text-slate-900 font-display">Selected Event</h3>
                    </div>
                    <button className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Title & Severity Badge */}
                  <div className="flex items-start justify-between gap-2 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                        <Droplet className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-slate-900 font-display leading-tight">
                          {selectedEvent.event_type}
                        </h2>
                        <span 
                          onClick={() => navigate(`/wells/${selectedEvent.well_id}`)}
                          className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          {selectedEvent.well_id}
                        </span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedEvent.severity === 'High' ? 'bg-red-100 text-red-700' :
                      selectedEvent.severity === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {selectedEvent.severity}
                    </span>
                  </div>

                  {/* 2x2 Meta Grid */}
                  <div className="grid grid-cols-2 gap-2.5 py-2.5 border-y border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Depth</span>
                      <span className="font-bold text-slate-900">{selectedEvent.depth.toLocaleString()} m</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Date & Time</span>
                      <span className="font-bold text-slate-900 text-[11px]">{selectedEvent.date_time}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Formation</span>
                      <span className="font-bold text-slate-900">{selectedEvent.formation}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Well</span>
                      <span 
                        onClick={() => navigate(`/wells/${selectedEvent.well_id}`)}
                        className="font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        {selectedEvent.well_id}
                      </span>
                    </div>
                  </div>

                  {/* Event Description */}
                  <div className="py-2.5">
                    <span className="text-[11px] font-bold text-slate-900 block mb-1 font-display">Event Description</span>
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                      {selectedEvent.description}
                    </p>
                  </div>

                  {/* Operational Impact (2 boxes) */}
                  <div className="grid grid-cols-2 gap-2.5 py-1">
                    <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-lg">
                      <span className="text-[10px] text-slate-400 font-medium block">NPT Impact</span>
                      <span className="text-sm font-black text-slate-900 font-display">{selectedEvent.npt_hours} hr</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-lg">
                      <span className="text-[10px] text-slate-400 font-medium block">Historical Recurrence</span>
                      <span className="text-sm font-black text-slate-900 font-display">{selectedEvent.recurrence} times</span>
                      <span className="text-[9px] text-slate-400 block">(in nearby wells)</span>
                    </div>
                  </div>

                  {/* Affected Nearby Wells */}
                  <div className="py-2">
                    <span className="text-[11px] font-bold text-slate-900 block mb-1 font-display">Affected Nearby Wells</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {selectedEvent.affected_wells.map((w) => (
                        <button
                          key={w}
                          onClick={() => navigate(`/wells/${w}`)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-[10px] font-bold transition-colors"
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Linked Evidence Documents */}
                  <div className="py-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-900 font-display">
                        Linked Evidence Documents ({selectedEvent.documents.length})
                      </span>
                      <button onClick={() => navigate('/documents')} className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5">
                        <span>View All</span>
                        <ChevronRight className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {selectedEvent.documents.map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-100 text-xs transition-colors">
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                            <span className="text-[11px] font-medium text-slate-800 truncate">{doc.name}</span>
                          </div>
                          <span className="px-2 py-0.5 bg-slate-200/80 text-slate-700 text-[9px] font-bold rounded">
                            {doc.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Bottom 4 Action Buttons Grid */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 mt-2">
                  <button 
                    onClick={() => navigate('/documents')}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#111E33] hover:bg-[#1A2C4B] text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Evidence</span>
                  </button>
                  <button 
                    onClick={() => navigate(`/wells/${selectedEvent.well_id}`)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold shadow-xs transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Well</span>
                  </button>
                  <button 
                    onClick={() => navigate('/wells')}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0F766E] hover:bg-[#115E59] text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Compare Wells</span>
                  </button>
                  <button 
                    onClick={() => navigate('/ai')}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#047857] hover:bg-[#065F46] text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Ask NWIS</span>
                  </button>
                </div>

              </div>
            </div>

          </div>

        </main>
      </div>

      {/* ============================================================ */}
      {/* LOG EVENT MODAL                                               */}
      {/* ============================================================ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-red-600" />
                <h2 className="text-sm font-bold text-slate-900">Log Drilling Event</h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                aria-label="Close"
              >
                <span className="text-lg leading-none">✕</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 px-5 py-4">
              <form id="log-event-form" onSubmit={handleAddEvent} className="space-y-3">
                {/* Row 1: Well ID + Event Type */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Well ID <span className="text-red-500">*</span></label>
                    <select
                      value={newEvent.well_id}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, well_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-red-600"
                      required
                    >
                      {['DUL-235', 'DUL-201', 'DUL-205', 'DUL-198', 'DUL-176', 'DUL-190', 'DUL-164', 'DKG-247', 'MRN-118'].map(w => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Event Type <span className="text-red-500">*</span></label>
                    <select
                      value={newEvent.event_type}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, event_type: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-red-600"
                      required
                    >
                      {['Mud Loss', 'Lost Circulation', 'Kick', 'High Torque', 'Stuck Pipe', 'Casing Issue', 'Pressure Anomaly', 'Bit Wear', 'Blowout Preventer Test', 'Equipment Failure', 'Gas Influx', 'Formation Damage'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Severity + Formation */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Severity <span className="text-red-500">*</span></label>
                    <select
                      value={newEvent.severity}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, severity: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-red-600"
                    >
                      {['Critical', 'High', 'Medium', 'Low'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Formation</label>
                    <select
                      value={newEvent.formation}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, formation: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-red-600"
                    >
                      {['Barail', 'Tipam', 'Girujan', 'Kopili/Shale', 'Namsang', 'Nahorkatiya Sand', 'Unknown'].map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 3: Depth + NPT Hours */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Depth MD (m)</label>
                    <input
                      type="number"
                      placeholder="e.g. 3242"
                      value={newEvent.depth_md}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, depth_md: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-red-600"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">NPT Hours</label>
                    <input
                      type="number"
                      placeholder="e.g. 12.5"
                      value={newEvent.npt_hours}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, npt_hours: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-red-600"
                      min="0"
                      step="0.5"
                    />
                  </div>
                </div>

                {/* Row 4: Description */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Description <span className="text-red-500">*</span></label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the drilling event, observations, and immediate actions taken..."
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-red-600 resize-none"
                    required
                  />
                </div>

                {/* Cost Impact */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Cost Impact (₹ Lakhs)</label>
                  <input
                    type="number"
                    placeholder="Estimated cost impact"
                    value={newEvent.cost_impact}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, cost_impact: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-red-600"
                    min="0"
                    step="0.5"
                  />
                </div>

                {/* Data Source Notice */}
                <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                    Event will be tagged as <strong>USER_UPLOADED</strong> provenance. Prototype data cannot be deleted.
                  </p>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="log-event-form"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Logging...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5" />
                    <span>Log Event</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
