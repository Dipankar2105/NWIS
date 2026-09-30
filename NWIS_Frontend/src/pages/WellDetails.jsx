import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import { useApp } from '../context/AppContext';
import { 
  wellsService, 
  eventsService, 
  predictionsService, 
  alertsService,
  extractErrorMessage 
} from '../services/api';
import { 
  Layers, 
  FileText, 
  AlertTriangle, 
  Clock, 
  Compass, 
  ChevronRight, 
  BarChart3, 
  Bot, 
  Activity, 
  MapPin, 
  Calendar, 
  Zap, 
  Info, 
  Search, 
  File, 
  ExternalLink,
  RefreshCw,
  Loader2,
  AlertCircle,
  HardHat,
  Gauge,
  ArrowDown,
  RotateCw,
  Droplet,
  Flame,
  CheckCircle2
} from 'lucide-react';

// Custom SVG Derrick Icon
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
const PinIcon = ({ className = "w-4 h-4 text-blue-600" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21s-6-5.333-6-10a6 6 0 0 1 12 0c0 4.667-6 10-6 10z" />
    <circle cx="12" cy="11" r="2.5" />
  </svg>
);

export default function WellDetails() {
  const { wellId = 'DUL-235' } = useParams();
  const navigate = useNavigate();
  const { selectWell } = useApp();

  // Normalize displayed well ID (e.g. DUL-235)
  const displayWellId = wellId.startsWith('WELL-') ? wellId.replace('WELL-', '') : wellId;

  const [activeTab, setActiveTab] = useState('Overview');
  const [selectedField, setSelectedField] = useState('Duliajan Field');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    selectWell(displayWellId);
  }, [displayWellId, selectWell]);

  // Well Profile Data State matching Well intelligence.png
  const [wellData, setWellData] = useState({
    id: displayWellId,
    well_name: displayWellId,
    status: 'ACTIVE DRILLING',
    field: 'Duliajan',
    coordinates: '26.7345° N, 95.3281° E',
    current_depth: '3,842 m',
    spud_date: '12 Jan 2026',
    formation: 'Barail',
    rig_status: 'On Operation',
    well_type: 'Development',
    last_updated: '29 Sept 2026, 10:42 AM'
  });

  // Real-time Drilling Parameters State
  const [drillingParams, setDrillingParams] = useState({
    depth: '3,842 m',
    rop: '18.4 m/hr',
    wob: '72 kN',
    rpm: '118 rpm',
    torque: '24.6 kN-m',
    mud_weight: '1.18 SG',
    flow_rate: '2,140 L/min',
    standpipe_pressure: '18.2 MPa'
  });

  // Nearby Wells State matching design
  const [nearbyWells, setNearbyWells] = useState([
    { well_id: 'DUL-201', distance: '3.2', depth: '3,100', status: 'Completed', statusColor: 'bg-sky-100 text-sky-800', events: 6, risk: 'High', riskColor: 'bg-red-100 text-red-700' },
    { well_id: 'DUL-205', distance: '3.4', depth: '2,950', status: 'Active', statusColor: 'bg-emerald-100 text-emerald-800', events: 4, risk: 'High', riskColor: 'bg-red-100 text-red-700' },
    { well_id: 'DUL-198', distance: '4.8', depth: '3,420', status: 'Completed', statusColor: 'bg-sky-100 text-sky-800', events: 6, risk: 'Medium', riskColor: 'bg-amber-100 text-amber-700' },
    { well_id: 'DUL-176', distance: '6.1', depth: '2,880', status: 'Standby', statusColor: 'bg-sky-100 text-sky-800', events: 3, risk: 'Medium', riskColor: 'bg-amber-100 text-amber-700' },
    { well_id: 'DUL-190', distance: '7.4', depth: '3,180', status: 'Completed', statusColor: 'bg-sky-100 text-sky-800', events: 4, risk: 'Low', riskColor: 'bg-emerald-100 text-emerald-700' }
  ]);

  // Recent Drilling Events State matching design
  const [recentEvents, setRecentEvents] = useState([
    { depth: '3,620', event_type: 'Mud Loss', severity: 'High', description: 'Severe mud loss observed', date_time: '28 Sept 2026, 14:20' },
    { depth: '3,210', event_type: 'High Torque', severity: 'High', description: 'Torque increased significantly', date_time: '25 Sept 2026, 09:15' },
    { depth: '2,950', event_type: 'Casing Issue', severity: 'Medium', description: 'Drag during casing run', date_time: '18 Sept 2026, 16:40' },
    { depth: '2,760', event_type: 'Pressure Anomaly', severity: 'Medium', description: 'Slight overpressure indication', date_time: '12 Sept 2026, 11:10' },
    { depth: '2,420', event_type: 'Lost Circulation', severity: 'Low', description: 'Minor losses, managed', date_time: '03 Sept 2026, 13:25' }
  ]);

  // Evidence & Documents State matching design
  const [documents, setDocuments] = useState([
    { name: `${displayWellId}_Daily_Drilling_Report.pdf`, type: 'DDR', date: '28 Sept 2026', status: 'Indexed' },
    { name: `${displayWellId}_Mud_Log.pdf`, type: 'Mud Log', date: '25 Sept 2026', status: 'Indexed' },
    { name: `${displayWellId}_Well_Report.pdf`, type: 'Well Report', date: '12 Sept 2026', status: 'Indexed' },
    { name: `${displayWellId}_Cementing_Report.pdf`, type: 'Completion', date: '05 Sept 2026', status: 'Processing' },
    { name: `${displayWellId}_Geology_Summary.pdf`, type: 'Geology', date: '01 Sept 2026', status: 'Indexed' }
  ]);

  // Fetch Well Data from Backend
  const loadWellDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch Well Details from backend
      try {
        const res = await wellsService.getById(wellId);
        if (res) {
          setWellData(prev => ({
            ...prev,
            id: displayWellId,
            well_name: displayWellId,
            status: 'ACTIVE DRILLING',
            field: res.operational_area || 'Duliajan'
          }));
        }
      } catch (e) {
        console.warn('Well details API note:', e.message);
      }

      // 2. Fetch Nearby Wells
      try {
        const nearbyRes = await wellsService.getNearby(wellId, 10);
        if (Array.isArray(nearbyRes) && nearbyRes.length > 0) {
          // preserve design table entries if 1 fallback item
          if (nearbyRes.length > 1) {
            setNearbyWells(nearbyRes.map(w => ({
              well_id: w.well_name || w.id,
              distance: w.distance_meters ? (w.distance_meters / 1000).toFixed(1) : '3.2',
              depth: '3,100',
              status: w.status ? w.status.charAt(0).toUpperCase() + w.status.slice(1) : 'Active',
              statusColor: w.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800',
              events: w.event_count || 4,
              risk: 'High',
              riskColor: 'bg-red-100 text-red-700'
            })));
          }
        }
      } catch (e) {
        console.warn('Nearby wells API note:', e.message);
      }

    } catch (err) {
      console.error('Failed to load well profile:', err);
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWellDetails();
  }, [wellId, selectedField]);

  return (
    <>
      {/* Left Navigation Sidebar */}

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* Top Header Bar matching Well intelligence.png */}
        <Header 
          title="Well Intelligence"
          subtitle="Operational profile, drilling history and evidence for the selected well"
          breadcrumb={[
            { label: 'Well Intelligence', link: '/wells' },
            { label: 'Well Details' }
          ]}
          selectedField={selectedField}
          onSelectField={setSelectedField}
          fields={['Duliajan Field', 'Moran Field', 'Nahorkatiya Field', 'Borholla Field']}
        />

        {/* Well Details Workspace */}
        <main className="flex-1 p-4 lg:p-5 space-y-4 max-w-[1600px] w-full mx-auto">

          {/* Error Banner if API Fails */}
          {error && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-amber-900 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={loadWellDetails}
                className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            </div>
          )}

          {/* ============================================================ */}
          {/* SECTION 1: WELL SUMMARY HERO CARD (Exact Match to Design)    */}
          {/* ============================================================ */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
            <div className="flex flex-col lg:flex-row gap-5 items-start lg:items-center">
              
              {/* Left: Rig Image Thumbnail matching design */}
              <div className="w-full sm:w-56 h-36 rounded-lg overflow-hidden flex-shrink-0 bg-slate-900 border border-slate-200 shadow-2xs">
                <img 
                  src="/assets/well-hero-rig.png" 
                  alt="Drilling Rig" 
                  className="w-full h-full object-cover object-center"
                />
              </div>

              {/* Right: Identity, Actions & 2x4 Meta Details Grid */}
              <div className="flex-1 min-w-0 w-full">
                
                {/* Identity Header & Action Buttons Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black text-slate-900 font-display tracking-tight">
                      {wellData.well_name}
                    </h2>
                    <span className="px-2.5 py-0.5 bg-[#DCFCE7] text-[#166534] font-extrabold text-[11px] rounded-md tracking-wider uppercase">
                      {wellData.status}
                    </span>
                  </div>

                  {/* 3 Top Action Buttons matching design */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Compare Offset Wells */}
                    <button 
                      onClick={() => navigate(`/comparison?well=${displayWellId}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111E33] hover:bg-[#1A2C4B] text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Compare Offset Wells</span>
                    </button>

                    {/* Run Risk Analysis */}
                    <button 
                      onClick={() => navigate(`/risk?well=${displayWellId}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#B91C1C] hover:bg-[#991B1B] text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Run Risk Analysis</span>
                    </button>

                    {/* Ask NWIS */}
                    <button 
                      onClick={() => navigate(`/ai?well=${displayWellId}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#047857] hover:bg-[#065F46] text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>Ask NWIS</span>
                    </button>
                  </div>
                </div>

                {/* 2x4 Metadata Information Grid matching Well intelligence.png */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-3 text-xs">
                  
                  {/* Field */}
                  <div className="flex items-center gap-2">
                    <DerrickIcon className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">Field</span>
                      <span className="font-bold text-slate-900">{wellData.field}</span>
                    </div>
                  </div>

                  {/* Current Depth */}
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">Current Depth</span>
                      <span className="font-bold text-slate-900">{wellData.current_depth}</span>
                    </div>
                  </div>

                  {/* Formation */}
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">Formation</span>
                      <span className="font-bold text-slate-900">{wellData.formation}</span>
                    </div>
                  </div>

                  {/* Well Type */}
                  <div className="flex items-center gap-2">
                    <HardHat className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">Well Type</span>
                      <span className="font-bold text-slate-900">{wellData.well_type}</span>
                    </div>
                  </div>

                  {/* Coordinates */}
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">Coordinates</span>
                      <span className="font-bold text-slate-900">{wellData.coordinates}</span>
                    </div>
                  </div>

                  {/* Spud Date */}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">Spud Date</span>
                      <span className="font-bold text-slate-900">{wellData.spud_date}</span>
                    </div>
                  </div>

                  {/* Rig Status */}
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">Rig Status</span>
                      <span className="font-bold text-slate-900">{wellData.rig_status}</span>
                    </div>
                  </div>

                  {/* Last Updated */}
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">Last Updated</span>
                      <span className="font-bold text-slate-900">{wellData.last_updated}</span>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>

          {/* ============================================================ */}
          {/* SECTION 2: NAVIGATION TABS BAR (Overview, Parameters, etc.)  */}
          {/* ============================================================ */}
          <div className="border-b border-slate-200 flex items-center gap-6 text-xs font-bold text-slate-500">
            {['Overview', 'Drilling Parameters', 'Events', 'Documents'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2.5 transition-all relative ${
                  activeTab === tab
                    ? 'text-slate-900 border-b-2 border-slate-900 font-black'
                    : 'hover:text-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ============================================================ */}
          {/* SECTION 3: MIDDLE 2:1 GRID (Real-time Params + Risk Snapshot) */}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Left Column (2/3 width): Parameters + Depth Chart + Formation Profile */}
            <div className="lg:col-span-2 space-y-4">
              
              {/* Parameters Card */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-800" />
                    <h3 className="text-xs font-extrabold text-slate-900 font-display">
                      Current Drilling Parameters (Real-time)
                    </h3>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Last updated: 2 min ago
                  </span>
                </div>

                {/* 2x4 Metric Parameters Badges Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  
                  {/* 1. Depth */}
                  <div className="p-2.5 bg-[#F8FAFC] border border-slate-200/70 rounded-lg flex items-center gap-2.5">
                    <div className="p-1.5 bg-white rounded-md shadow-2xs">
                      <DerrickIcon className="w-4 h-4 text-slate-800" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">Depth</span>
                      <span className="text-xs font-black text-slate-900 font-display">{drillingParams.depth}</span>
                    </div>
                  </div>

                  {/* 2. ROP */}
                  <div className="p-2.5 bg-[#F8FAFC] border border-slate-200/70 rounded-lg flex items-center gap-2.5">
                    <div className="p-1.5 bg-white rounded-md shadow-2xs">
                      <Gauge className="w-4 h-4 text-slate-800" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">ROP</span>
                      <span className="text-xs font-black text-slate-900 font-display">{drillingParams.rop}</span>
                    </div>
                  </div>

                  {/* 3. WOB */}
                  <div className="p-2.5 bg-[#F8FAFC] border border-slate-200/70 rounded-lg flex items-center gap-2.5">
                    <div className="p-1.5 bg-white rounded-md shadow-2xs">
                      <ArrowDown className="w-4 h-4 text-slate-800" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">WOB</span>
                      <span className="text-xs font-black text-slate-900 font-display">{drillingParams.wob}</span>
                    </div>
                  </div>

                  {/* 4. RPM */}
                  <div className="p-2.5 bg-[#F8FAFC] border border-slate-200/70 rounded-lg flex items-center gap-2.5">
                    <div className="p-1.5 bg-white rounded-md shadow-2xs">
                      <RotateCw className="w-4 h-4 text-slate-800" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">RPM</span>
                      <span className="text-xs font-black text-slate-900 font-display">{drillingParams.rpm}</span>
                    </div>
                  </div>

                  {/* 5. Torque */}
                  <div className="p-2.5 bg-[#F8FAFC] border border-slate-200/70 rounded-lg flex items-center gap-2.5">
                    <div className="p-1.5 bg-white rounded-md shadow-2xs">
                      <Gauge className="w-4 h-4 text-slate-800" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">Torque</span>
                      <span className="text-xs font-black text-slate-900 font-display">{drillingParams.torque}</span>
                    </div>
                  </div>

                  {/* 6. Mud Weight */}
                  <div className="p-2.5 bg-[#F8FAFC] border border-slate-200/70 rounded-lg flex items-center gap-2.5">
                    <div className="p-1.5 bg-white rounded-md shadow-2xs">
                      <Droplet className="w-4 h-4 text-slate-800" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">Mud Weight</span>
                      <span className="text-xs font-black text-slate-900 font-display">{drillingParams.mud_weight}</span>
                    </div>
                  </div>

                  {/* 7. Flow Rate */}
                  <div className="p-2.5 bg-[#F8FAFC] border border-slate-200/70 rounded-lg flex items-center gap-2.5">
                    <div className="p-1.5 bg-white rounded-md shadow-2xs">
                      <Droplet className="w-4 h-4 text-slate-800" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">Flow Rate</span>
                      <span className="text-xs font-black text-slate-900 font-display">{drillingParams.flow_rate}</span>
                    </div>
                  </div>

                  {/* 8. Standpipe Pressure */}
                  <div className="p-2.5 bg-[#F8FAFC] border border-slate-200/70 rounded-lg flex items-center gap-2.5">
                    <div className="p-1.5 bg-white rounded-md shadow-2xs">
                      <Gauge className="w-4 h-4 text-slate-800" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">Standpipe Pressure</span>
                      <span className="text-xs font-black text-slate-900 font-display">{drillingParams.standpipe_pressure}</span>
                    </div>
                  </div>

                </div>

                {/* Sub-Charts Row: Depth vs Time Line Chart & Formation Stratigraphy */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-3.5 pt-3 border-t border-slate-100">
                  
                  {/* Depth vs Time Dual-Axis Line Chart (2 cols) */}
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-extrabold text-slate-900 font-display">Depth vs Time</span>
                      <div className="flex items-center gap-3 text-[10px] font-bold">
                        <span className="flex items-center gap-1 text-blue-600">
                          <span className="w-2 h-2 rounded-full bg-blue-600" />
                          Depth (m)
                        </span>
                        <span className="flex items-center gap-1 text-amber-600">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          ROP (m/hr)
                        </span>
                      </div>
                    </div>

                    {/* Dual-axis SVG Chart Area with exact axes labels */}
                    <div className="h-44 w-full relative bg-[#FAFBFD] rounded-lg border border-slate-200/60 p-2 flex flex-col justify-between">
                      {/* Left Axis: Depth (0 to 4000) & Right Axis: ROP (40 to 0) */}
                      <div className="absolute left-1 top-2 bottom-6 flex flex-col justify-between text-[8px] font-mono text-slate-400 select-none">
                        <span>0</span>
                        <span>1,000</span>
                        <span>2,000</span>
                        <span>3,000</span>
                        <span>4,000</span>
                      </div>

                      <div className="absolute right-1 top-2 bottom-6 flex flex-col justify-between text-[8px] font-mono text-amber-600 select-none">
                        <span>40</span>
                        <span>30</span>
                        <span>20</span>
                        <span>10</span>
                        <span>0</span>
                      </div>

                      {/* Grid Lines */}
                      <div className="absolute inset-x-8 inset-y-3 flex flex-col justify-between pointer-events-none opacity-30">
                        <div className="border-b border-slate-300 w-full" />
                        <div className="border-b border-slate-300 w-full" />
                        <div className="border-b border-slate-300 w-full" />
                        <div className="border-b border-slate-300 w-full" />
                      </div>

                      {/* Line Chart SVG */}
                      <div className="mx-6 h-full">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 300 110" preserveAspectRatio="none">
                          {/* Blue Line: Descending Depth */}
                          <path 
                            d="M 10 10 L 70 35 L 140 60 L 210 80 L 290 100" 
                            fill="none" 
                            stroke="#2563EB" 
                            strokeWidth="2.4" 
                            strokeLinecap="round" 
                          />
                          {/* Orange Line: Jagged ROP */}
                          <path 
                            d="M 10 75 L 30 60 L 50 85 L 70 65 L 90 50 L 110 70 L 130 55 L 150 80 L 170 65 L 190 85 L 210 55 L 230 70 L 250 50 L 270 75 L 290 55" 
                            fill="none" 
                            stroke="#F59E0B" 
                            strokeWidth="1.8" 
                            strokeLinecap="round" 
                          />
                        </svg>
                      </div>

                      {/* X-Axis Date Labels */}
                      <div className="flex items-center justify-between text-[9px] text-slate-400 font-medium px-8 pt-1 border-t border-slate-200/50">
                        <span>Jan 13</span>
                        <span>Jan 17</span>
                        <span>Jan 21</span>
                        <span>Jan 25</span>
                        <span>Jan 29</span>
                      </div>
                    </div>
                  </div>

                  {/* Formation Profile Stratigraphic Column matching design */}
                  <div>
                    <span className="text-[11px] font-extrabold text-slate-900 font-display block mb-1.5">
                      Formation Profile
                    </span>
                    
                    {/* Vertical Colored Stratigraphic Column */}
                    <div className="space-y-1 text-[10px] font-bold">
                      
                      {/* 0 - 500: Alluvium */}
                      <div className="p-1.5 bg-[#D1FAE5] text-[#065F46] rounded flex items-center justify-between shadow-2xs">
                        <span className="font-mono text-[9px]">0 – 500 m</span>
                        <span>Alluvium</span>
                      </div>

                      {/* 500 - 1000: Dihing */}
                      <div className="p-1.5 bg-[#FEF3C7] text-[#92400E] rounded flex items-center justify-between shadow-2xs">
                        <span className="font-mono text-[9px]">500 – 1,000 m</span>
                        <span>Dihing</span>
                      </div>

                      {/* 1000 - 2000: Tipam */}
                      <div className="p-1.5 bg-[#A7F3D0] text-[#065F46] rounded flex items-center justify-between shadow-2xs">
                        <span className="font-mono text-[9px]">1,000 – 2,000 m</span>
                        <span>Tipam</span>
                      </div>

                      {/* 2000 - 2500: Girujan */}
                      <div className="p-1.5 bg-[#BAE6FD] text-[#0369A1] rounded flex items-center justify-between shadow-2xs">
                        <span className="font-mono text-[9px]">2,000 – 2,500 m</span>
                        <span>Girujan</span>
                      </div>

                      {/* 2500 - 3500: Barail (Current Target) */}
                      <div className="p-1.5 bg-[#EDE9FE] text-[#5B21B6] rounded flex items-center justify-between ring-1 ring-purple-300 shadow-2xs">
                        <span className="font-mono text-[9px]">2,500 – 3,500 m</span>
                        <span>Barail</span>
                      </div>

                      {/* 3500 - 4000: Kopili/Shale */}
                      <div className="p-1.5 bg-[#FED7AA] text-[#9A3412] rounded flex items-center justify-between shadow-2xs">
                        <span className="font-mono text-[9px]">3,500 – 4,000 m</span>
                        <span>Kopili/Shale</span>
                      </div>

                    </div>
                  </div>

                </div>

              </div>

            </div>

            {/* Right Column (1/3 width): Risk Snapshot & Nearby Wells Table */}
            <div className="space-y-4">
              
              {/* 1. Risk Snapshot Card */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
                {/* Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <h3 className="text-xs font-extrabold text-slate-900 font-display">Risk Snapshot</h3>
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <button onClick={() => navigate('/risk')} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                    <span>View Detailed Analysis</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Donut Score & Horizontal Risk Bars */}
                <div className="flex items-center gap-4">
                  {/* Donut Gauge */}
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#F1F5F9" strokeWidth="12" />
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#F59E0B" strokeWidth="12" strokeDasharray="160 240" strokeDashoffset="0" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-black text-slate-900 leading-none font-display">Medium</span>
                      <span className="text-[8px] text-slate-400 font-medium mt-0.5">Overall Risk</span>
                    </div>
                  </div>

                  {/* 4 Horizontal Risk Bars */}
                  <div className="space-y-2 flex-1 text-[10px]">
                    {/* Mud Loss */}
                    <div>
                      <div className="flex items-center justify-between font-bold mb-0.5">
                        <span className="text-slate-600">Mud Loss Risk</span>
                        <span className="text-red-600">High</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-600 rounded-full w-[85%]" />
                      </div>
                    </div>

                    {/* High Torque */}
                    <div>
                      <div className="flex items-center justify-between font-bold mb-0.5">
                        <span className="text-slate-600">High Torque Risk</span>
                        <span className="text-amber-600">Medium</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full w-[65%]" />
                      </div>
                    </div>

                    {/* Overpressure */}
                    <div>
                      <div className="flex items-center justify-between font-bold mb-0.5">
                        <span className="text-slate-600">Overpressure Risk</span>
                        <span className="text-amber-600">Medium</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full w-[60%]" />
                      </div>
                    </div>

                    {/* Casing Wear */}
                    <div>
                      <div className="flex items-center justify-between font-bold mb-0.5">
                        <span className="text-slate-600">Casing Wear Risk</span>
                        <span className="text-emerald-600">Low</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full w-[30%]" />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* 2. Nearby Relevant Wells (within 10 km) Card */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
                {/* Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <DerrickIcon className="w-3.5 h-3.5 text-slate-800" />
                    <h3 className="text-xs font-extrabold text-slate-900 font-display">Nearby Relevant Wells (within 10 km)</h3>
                  </div>
                  <button onClick={() => navigate('/wells')} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                    <span>View All</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] leading-tight">
                    <thead>
                      <tr className="text-slate-400 font-medium border-b border-slate-100 text-[10px]">
                        <th className="pb-1.5 font-medium">Well ID</th>
                        <th className="pb-1.5 font-medium">Dist (km)</th>
                        <th className="pb-1.5 font-medium">Depth (m)</th>
                        <th className="pb-1.5 font-medium">Status</th>
                        <th className="pb-1.5 font-medium">Key Events</th>
                        <th className="pb-1.5 font-medium">Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/70 text-slate-700">
                      {nearbyWells.map((w, idx) => (
                        <tr 
                          key={idx} 
                          onClick={() => navigate(`/wells/${w.well_id}`)}
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <td className="py-1.5 font-bold text-blue-600 hover:underline">{w.well_id}</td>
                          <td className="py-1.5 text-slate-600">{w.distance}</td>
                          <td className="py-1.5 text-slate-600">{w.depth}</td>
                          <td className="py-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${w.statusColor}`}>
                              {w.status}
                            </span>
                          </td>
                          <td className="py-1.5 text-slate-800 font-bold text-center">{w.events}</td>
                          <td className="py-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${w.riskColor}`}>
                              {w.risk}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>

          </div>

          {/* ============================================================ */}
          {/* SECTION 4: LOWER TABLES (Recent Drilling Events & Evidence)  */}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Table 1: Recent Drilling Events */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-800" />
                  <h3 className="text-xs font-extrabold text-slate-900 font-display">Recent Drilling Events</h3>
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
                      <th className="pb-1.5 font-medium">Depth (m)</th>
                      <th className="pb-1.5 font-medium">Event Type</th>
                      <th className="pb-1.5 font-medium">Severity</th>
                      <th className="pb-1.5 font-medium">Description</th>
                      <th className="pb-1.5 font-medium">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/70 text-slate-700">
                    {recentEvents.map((evt, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-1.5 font-bold text-slate-900 whitespace-nowrap">{evt.depth}</td>
                        <td className="py-1.5 text-slate-800 font-semibold whitespace-nowrap">{evt.event_type}</td>
                        <td className="py-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            evt.severity === 'High' ? 'bg-red-100 text-red-700' :
                            evt.severity === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {evt.severity}
                          </span>
                        </td>
                        <td className="py-1.5 text-slate-600 truncate max-w-[180px]">{evt.description}</td>
                        <td className="py-1.5 text-slate-400 text-[10px] whitespace-nowrap">{evt.date_time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 2: Evidence & Documents (5) */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <File className="w-3.5 h-3.5 text-slate-800" />
                  <h3 className="text-xs font-extrabold text-slate-900 font-display">Evidence & Documents (5)</h3>
                </div>
                <button onClick={() => navigate('/documents')} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                  <span>View All</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] leading-tight">
                  <thead>
                    <tr className="text-slate-400 font-medium border-b border-slate-100 text-[10px]">
                      <th className="pb-1.5 font-medium">Document Name</th>
                      <th className="pb-1.5 font-medium">Type</th>
                      <th className="pb-1.5 font-medium">Date</th>
                      <th className="pb-1.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/70 text-slate-700">
                    {documents.map((doc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-1.5 font-semibold text-slate-900 flex items-center gap-1.5 truncate max-w-[200px]">
                          <FileText className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                          <span className="truncate">{doc.name}</span>
                        </td>
                        <td className="py-1.5 text-slate-600 whitespace-nowrap">{doc.type}</td>
                        <td className="py-1.5 text-slate-500 whitespace-nowrap">{doc.date}</td>
                        <td className="py-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            doc.status === 'Indexed' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF3C7] text-[#92400E]'
                          }`}>
                            {doc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* ============================================================ */}
          {/* SECTION 5: BOTTOM 4 SUMMARY CARDS + 1 AI INSIGHT CARD        */}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-1">
            
            {/* 1. Total Events */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 text-blue-600">
                  <PinIcon className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <span className="text-xl font-black text-slate-900 font-display">7</span>
                  <span className="text-[10px] text-slate-400 font-medium block">Total Events</span>
                </div>
              </div>
              <div className="mt-2 text-[10px] font-bold text-emerald-600">
                ↑ 12% vs Last Month
              </div>
            </div>

            {/* 2. NPT Hours (YTD) */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 text-slate-800">
                  <Clock className="w-4 h-4 text-slate-800" />
                </div>
                <div>
                  <span className="text-xl font-black text-slate-900 font-display">4.5 hr</span>
                  <span className="text-[10px] text-slate-400 font-medium block">NPT Hours (YTD)</span>
                </div>
              </div>
              <div className="mt-2 text-[10px] font-bold text-emerald-600">
                ↓ 22% vs Last Quarter
              </div>
            </div>

            {/* 3. Nearby Wells */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 text-blue-600">
                  <DerrickIcon className="w-4 h-4 text-slate-800" />
                </div>
                <div>
                  <span className="text-xl font-black text-slate-900 font-display">12</span>
                  <span className="text-[10px] text-slate-400 font-medium block">Nearby Wells (10 km)</span>
                </div>
              </div>
              <div className="mt-2 text-[10px] font-bold text-emerald-600">
                ↑ 20% vs Previous Analysis
              </div>
            </div>

            {/* 4. Relevant Documents */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 text-slate-800">
                  <FileText className="w-4 h-4 text-slate-800" />
                </div>
                <div>
                  <span className="text-xl font-black text-slate-900 font-display">5</span>
                  <span className="text-[10px] text-slate-400 font-medium block">Relevant Documents</span>
                </div>
              </div>
              <div className="mt-2 text-[10px] font-bold text-emerald-600">
                ↑ 25% vs Last Month
              </div>
            </div>

            {/* 5. AI Insight Panel (Spans 2 columns) */}
            <div className="lg:col-span-2 bg-[#F0FDF4] border border-emerald-200/80 rounded-xl p-3 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-[#0A1322] text-white flex items-center justify-center">
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs font-black text-slate-900 font-display">AI Insight</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-medium">Based on 3 nearby wells</span>
                </div>
                <p className="text-[11px] text-slate-700 leading-snug">
                  Similar drilling behaviour detected in nearby offset wells. High torque and mud loss events observed in wells DUL-201 and DUL-205 at similar depths within the Barail formation.
                </p>
              </div>

              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => navigate('/ai')}
                  className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-900 border border-slate-300 rounded-md text-[10px] font-bold shadow-2xs transition-colors"
                >
                  <span>View Evidence</span>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                </button>
              </div>
            </div>

          </div>

        </main>
      </div>
    </>
  );
}
