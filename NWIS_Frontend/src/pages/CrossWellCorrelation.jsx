import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import { 
  wellsService, 
  eventsService, 
  analyticsService,
  extractErrorMessage 
} from '../services/api';
import { 
  Layers, 
  Filter, 
  RotateCcw, 
  Download, 
  Sparkles, 
  Plus, 
  X, 
  ChevronDown, 
  TrendingUp, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Compass, 
  Droplet, 
  Zap, 
  Cog, 
  Bot, 
  Eye, 
  ArrowRight,
  HelpCircle,
  BarChart2
} from 'lucide-react';

// Well Color Mapping matching design
const WELL_COLORS = [
  { border: 'border-emerald-600', dot: 'bg-emerald-500', stroke: '#10B981', fill: 'rgba(16, 185, 129, 0.1)', text: 'text-emerald-700' },
  { border: 'border-blue-600', dot: 'bg-blue-500', stroke: '#2563EB', fill: 'rgba(37, 99, 235, 0.1)', text: 'text-blue-700' },
  { border: 'border-rose-600', dot: 'bg-rose-500', stroke: '#E11D48', fill: 'rgba(225, 29, 72, 0.1)', text: 'text-rose-700' },
  { border: 'border-amber-600', dot: 'bg-amber-500', stroke: '#D97706', fill: 'rgba(217, 119, 6, 0.1)', text: 'text-amber-700' },
];

// Formation Color Palette matching cross well corelation.png
const FORMATION_PALETTE = {
  'Alluvium': { bg: '#DCFCE7', text: '#166534', border: '#86EFAC' },
  'Dihing': { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  'Dhekiajuli': { bg: '#FEF9C3', text: '#854D0E', border: '#FEF08A' },
  'Tipam': { bg: '#CCFBF1', text: '#115E59', border: '#99F6E4' },
  'Tipam Sandstone': { bg: '#CCFBF1', text: '#115E59', border: '#99F6E4' },
  'Girujan': { bg: '#BAE6FD', text: '#075985', border: '#7DD3FC' },
  'Girujan Clay': { bg: '#BAE6FD', text: '#075985', border: '#7DD3FC' },
  'Bokabil': { bg: '#E0E7FF', text: '#3730A3', border: '#C7D2FE' },
  'Barail': { bg: '#FECDD3', text: '#9F1239', border: '#FDA4AF' },
  'Barail Sand': { bg: '#FECDD3', text: '#9F1239', border: '#FDA4AF' },
  'Kopili': { bg: '#FFEDD5', text: '#9A3412', border: '#FED7AA' },
  'Kopili Shale': { bg: '#FFEDD5', text: '#9A3412', border: '#FED7AA' },
  'Kopili/Shale': { bg: '#FFEDD5', text: '#9A3412', border: '#FED7AA' },
};

// Default Stratigraphy Tops fallback when well tops are being normalized
const DEFAULT_FORMATION_TOPS = [
  { formation: 'Alluvium', top_md: 0, bottom_md: 450 },
  { formation: 'Dihing', top_md: 450, bottom_md: 1200 },
  { formation: 'Tipam', top_md: 1200, bottom_md: 2100 },
  { formation: 'Girujan', top_md: 2100, bottom_md: 3100 },
  { formation: 'Barail', top_md: 3100, bottom_md: 3650 },
  { formation: 'Kopili/Shale', top_md: 3650, bottom_md: 4000 }
];

export default function CrossWellCorrelation() {
  const navigate = useNavigate();

  // State
  const [allWells, setAllWells] = useState([]);
  const [selectedWellIds, setSelectedWellIds] = useState(['DKG-247', 'DKG-231', 'DKG-215', 'MKG-118']);
  const [wellDataMap, setWellDataMap] = useState({});
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedFormation, setSelectedFormation] = useState('All Formations');
  const [depthRange, setDepthRange] = useState({ min: 0, max: 4000 });
  const [showAddWellDropdown, setShowAddWellDropdown] = useState(false);

  // Load Wells & Events from Real Backend
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [wellsRes, eventsRes] = await Promise.all([
          wellsService.getAll(),
          eventsService.getAll({ limit: 50 })
        ]);

        const wellsList = Array.isArray(wellsRes) ? wellsRes : (wellsRes?.wells || []);
        setAllWells(wellsList);

        // Normalize initial selection to match actual wells available in backend
        if (wellsList.length > 0) {
          const validIds = wellsList.map(w => w.well_name || w.id);
          const initial = ['DKG-247', 'DKG-231', 'DKG-215', 'MKG-118'].filter(id => validIds.includes(id));
          if (initial.length === 0) {
            setSelectedWellIds(validIds.slice(0, 4));
          } else {
            setSelectedWellIds(initial);
          }
        }

        const eventsList = Array.isArray(eventsRes) ? eventsRes : (eventsRes?.events || []);
        setAllEvents(eventsList);
      } catch (err) {
        console.error('Error fetching correlation data:', err);
        setError(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch individual well details for all selected wells
  useEffect(() => {
    if (selectedWellIds.length === 0) return;

    const fetchSelectedWells = async () => {
      const map = {};
      await Promise.all(
        selectedWellIds.map(async (wId) => {
          try {
            const data = await wellsService.getById(wId);
            map[wId] = data;
          } catch (e) {
            console.warn(`Could not load well details for ${wId}:`, e);
          }
        })
      );
      setWellDataMap(map);
    };

    fetchSelectedWells();
  }, [selectedWellIds]);

  // Add / Remove Wells (Max 4)
  const handleAddWell = (wellName) => {
    if (selectedWellIds.length >= 4) {
      alert('Maximum of 4 wells can be selected for cross-well correlation.');
      return;
    }
    if (!selectedWellIds.includes(wellName)) {
      setSelectedWellIds([...selectedWellIds, wellName]);
    }
    setShowAddWellDropdown(false);
  };

  const handleRemoveWell = (wellName) => {
    if (selectedWellIds.length <= 1) {
      alert('At least 1 well must remain selected for correlation.');
      return;
    }
    setSelectedWellIds(selectedWellIds.filter(id => id !== wellName));
  };

  // Reset Filters
  const handleReset = () => {
    setSelectedFormation('All Formations');
    setDepthRange({ min: 0, max: 4000 });
  };

  // Available wells to add
  const availableWellsToAdd = useMemo(() => {
    return allWells.filter(w => !selectedWellIds.includes(w.well_name || w.id));
  }, [allWells, selectedWellIds]);

  // Formations available across selected wells
  const availableFormations = useMemo(() => {
    const list = new Set(['All Formations']);
    selectedWellIds.forEach(wId => {
      const well = wellDataMap[wId];
      if (well?.formation_tops) {
        well.formation_tops.forEach(t => list.add(t.formation));
      }
    });
    // Add standard basin formations
    ['Alluvium', 'Dihing', 'Tipam', 'Girujan', 'Barail', 'Kopili/Shale'].forEach(f => list.add(f));
    return Array.from(list);
  }, [selectedWellIds, wellDataMap]);

  // Synthetic ROP / Torque / Mud Weight curve points based on depth for selected wells
  const generateWellCurves = (wellId, index) => {
    const depths = [0, 500, 1000, 1500, 2000, 2500, 3000, 3200, 3400, 3600, 3800, 4000];
    const offsetSeed = (index + 1) * 2.5;

    const ropCurve = depths.map((d) => {
      let rop = 25 - (d / 4000) * 15 + Math.sin((d + offsetSeed * 100) / 300) * 8;
      if (d > 3100) rop = Math.max(4, rop - 6); // ROP decline in Barail/Kopili
      return { depth: d, rop: Math.max(3, Math.min(38, rop)) };
    });

    const torqueCurve = depths.map((d) => {
      let tq = 8 + (d / 4000) * 18 + Math.cos((d + offsetSeed * 80) / 250) * 5;
      if (d >= 3200 && d <= 3700) tq += (index % 2 === 0 ? 9 : 6); // Torque spikes in 3400-3700
      return { depth: d, torque: Math.max(5, Math.min(38, tq)) };
    });

    const mudWeightCurve = depths.map((d) => {
      let mw = 1.05;
      if (d >= 1200) mw = 1.15 + (index * 0.03);
      if (d >= 2100) mw = 1.30 + (index * 0.02);
      if (d >= 3100) mw = 1.55 + (index * 0.04);
      if (d >= 3650) mw = 1.70 + (index * 0.02);
      return { depth: d, mudWeight: Math.min(1.85, mw) };
    });

    return { ropCurve, torqueCurve, mudWeightCurve };
  };

  // Correlation Findings Table Data
  const findings = [
    {
      depth: '3,200 – 3,400',
      formation: 'Barail',
      behavior: 'Mud loss events',
      wells: 'DKG-231, DKG-215, DKG-247',
      event: 'Mud Loss',
      risk: 'High',
      riskColor: 'bg-red-50 text-red-700 border-red-200'
    },
    {
      depth: '3,400 – 3,700',
      formation: 'Barail',
      behavior: 'High torque spikes',
      wells: 'DKG-231, MKG-118',
      event: 'High Torque',
      risk: 'High',
      riskColor: 'bg-red-50 text-red-700 border-red-200'
    },
    {
      depth: '2,800 – 3,100',
      formation: 'Tipam / Barail',
      behavior: 'ROP decline',
      wells: 'All wells',
      event: 'ROP Decrease',
      risk: 'Medium',
      riskColor: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    {
      depth: '3,100 – 3,300',
      formation: 'Barail',
      behavior: 'Casing issues',
      wells: 'MKG-118, DKG-215',
      event: 'Casing Issue',
      risk: 'Medium',
      riskColor: 'bg-amber-50 text-amber-700 border-amber-200'
    }
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header */}
        <Header 
          title="Cross-Well Correlation" 
          subtitle="Compare geological and operational behaviour across multiple wells to identify patterns and risks"
          breadcrumb={[
            { label: 'Analytics', link: '/analytics' },
            { label: 'Cross-Well Correlation' }
          ]}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto space-y-4">
          
          {/* ========================================================================= */}
          {/* FILTER / WELL SELECTION BAR matching cross well corelation.png */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Left: Well Selector Pills (Max 4) */}
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-xs font-extrabold text-slate-700 whitespace-nowrap">
                Select Wells (Max 4)
              </span>

              {selectedWellIds.map((wId, idx) => {
                const color = WELL_COLORS[idx % WELL_COLORS.length];
                return (
                  <div
                    key={wId}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F8FAFC] border border-slate-200 rounded-lg text-xs font-bold text-slate-800 shadow-2xs"
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
                    <span>{wId}</span>
                    <button
                      onClick={() => handleRemoveWell(wId)}
                      className="ml-1 p-0.5 text-slate-400 hover:text-red-500 rounded transition-colors"
                      title="Remove well"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}

              {/* Add Well Dropdown Button */}
              {selectedWellIds.length < 4 && (
                <div className="relative">
                  <button
                    onClick={() => setShowAddWellDropdown(!showAddWellDropdown)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-dashed border-slate-300 rounded-lg text-xs font-bold text-slate-600 transition-colors shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-500" />
                    <span>Add Well</span>
                  </button>

                  {showAddWellDropdown && (
                    <div className="absolute left-0 mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-40 max-h-56 overflow-y-auto">
                      <div className="px-3 py-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Available Wells
                      </div>
                      {availableWellsToAdd.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-slate-400">No other wells available</div>
                      ) : (
                        availableWellsToAdd.map(w => {
                          const name = w.well_name || w.id;
                          return (
                            <button
                              key={name}
                              onClick={() => handleAddWell(name)}
                              className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between transition-colors"
                            >
                              <span>{name}</span>
                              <span className="text-[10px] text-slate-400">{w.field_name || w.operational_area}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Formation Selector, Depth Range & Action Buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Formation Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Formation</span>
                <select
                  value={selectedFormation}
                  onChange={(e) => setSelectedFormation(e.target.value)}
                  className="px-3 py-1.5 bg-[#F8FAFC] border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {availableFormations.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              {/* Depth Range */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Depth Range (m)</span>
                <input
                  type="number"
                  value={depthRange.min}
                  onChange={(e) => setDepthRange({ ...depthRange, min: Number(e.target.value) })}
                  className="w-14 px-2 py-1.5 bg-[#F8FAFC] border border-slate-200 rounded-lg text-xs text-center font-bold text-slate-800"
                />
                <span className="text-slate-400 text-xs">–</span>
                <input
                  type="number"
                  value={depthRange.max}
                  onChange={(e) => setDepthRange({ ...depthRange, max: Number(e.target.value) })}
                  className="w-16 px-2 py-1.5 bg-[#F8FAFC] border border-slate-200 rounded-lg text-xs text-center font-bold text-slate-800"
                />
              </div>

              {/* Action Buttons */}
              <button
                onClick={() => {}}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                <Filter className="w-3.5 h-3.5" />
                Apply Comparison
              </button>

              <button
                onClick={handleReset}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                Reset
              </button>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* TOP ROW: 3 COMPARISON CHARTS + CORRELATION INSIGHTS PANEL */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* 3 Operational Depth Charts (9 Cols) */}
            <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Chart 1: Depth vs ROP */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-slate-700" />
                    <h3 className="text-xs font-extrabold text-slate-900">Depth vs ROP</h3>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">m/hr</span>
                </div>

                {/* SVG Line Graph */}
                <div className="h-48 w-full relative py-2">
                  <div className="absolute left-0 top-1 text-[9px] font-bold text-slate-400">Depth (m)</div>
                  
                  <svg className="w-full h-full" viewBox="0 0 200 160" preserveAspectRatio="none">
                    {/* Grid */}
                    <line x1="30" y1="10" x2="195" y2="10" stroke="#F1F5F9" strokeWidth="1" />
                    <line x1="30" y1="45" x2="195" y2="45" stroke="#F1F5F9" strokeWidth="1" />
                    <line x1="30" y1="80" x2="195" y2="80" stroke="#F1F5F9" strokeWidth="1" />
                    <line x1="30" y1="115" x2="195" y2="115" stroke="#F1F5F9" strokeWidth="1" />
                    <line x1="30" y1="150" x2="195" y2="150" stroke="#E2E8F0" strokeWidth="1" />
                    <line x1="30" y1="10" x2="30" y2="150" stroke="#E2E8F0" strokeWidth="1" />

                    {/* Depth Y Ticks */}
                    <text x="24" y="14" textAnchor="end" fill="#94A3B8" fontSize="7">0</text>
                    <text x="24" y="49" textAnchor="end" fill="#94A3B8" fontSize="7">1,000</text>
                    <text x="24" y="84" textAnchor="end" fill="#94A3B8" fontSize="7">2,000</text>
                    <text x="24" y="119" textAnchor="end" fill="#94A3B8" fontSize="7">3,000</text>
                    <text x="24" y="153" textAnchor="end" fill="#94A3B8" fontSize="7">4,000</text>

                    {/* Curves for selected wells */}
                    {selectedWellIds.map((wId, idx) => {
                      const color = WELL_COLORS[idx % WELL_COLORS.length];
                      const { ropCurve } = generateWellCurves(wId, idx);
                      const points = ropCurve.map(p => {
                        const x = 30 + (p.rop / 40) * 160;
                        const y = 10 + (p.depth / 4000) * 140;
                        return `${x},${y}`;
                      }).join(' ');

                      return (
                        <polyline
                          key={wId}
                          fill="none"
                          stroke={color.stroke}
                          strokeWidth="2"
                          strokeLinecap="round"
                          points={points}
                        />
                      );
                    })}
                  </svg>
                </div>

                {/* X Ticks & Legend */}
                <div className="flex justify-between px-6 text-[8px] text-slate-400 font-bold border-t border-slate-100 pt-1">
                  <span>0</span>
                  <span>10</span>
                  <span>20</span>
                  <span>30</span>
                  <span>40 ROP (m/hr)</span>
                </div>
              </div>

              {/* Chart 2: Torque vs Depth */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Cog className="w-4 h-4 text-slate-700" />
                    <h3 className="text-xs font-extrabold text-slate-900">Torque vs Depth</h3>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">kN-m</span>
                </div>

                {/* SVG Line Graph */}
                <div className="h-48 w-full relative py-2">
                  <div className="absolute left-0 top-1 text-[9px] font-bold text-slate-400">Depth (m)</div>

                  <svg className="w-full h-full" viewBox="0 0 200 160" preserveAspectRatio="none">
                    {/* Grid */}
                    <line x1="30" y1="10" x2="195" y2="10" stroke="#F1F5F9" strokeWidth="1" />
                    <line x1="30" y1="45" x2="195" y2="45" stroke="#F1F5F9" strokeWidth="1" />
                    <line x1="30" y1="80" x2="195" y2="80" stroke="#F1F5F9" strokeWidth="1" />
                    <line x1="30" y1="115" x2="195" y2="115" stroke="#F1F5F9" strokeWidth="1" />
                    <line x1="30" y1="150" x2="195" y2="150" stroke="#E2E8F0" strokeWidth="1" />
                    <line x1="30" y1="10" x2="30" y2="150" stroke="#E2E8F0" strokeWidth="1" />

                    {/* Depth Y Ticks */}
                    <text x="24" y="14" textAnchor="end" fill="#94A3B8" fontSize="7">0</text>
                    <text x="24" y="49" textAnchor="end" fill="#94A3B8" fontSize="7">1,000</text>
                    <text x="24" y="84" textAnchor="end" fill="#94A3B8" fontSize="7">2,000</text>
                    <text x="24" y="119" textAnchor="end" fill="#94A3B8" fontSize="7">3,000</text>
                    <text x="24" y="153" textAnchor="end" fill="#94A3B8" fontSize="7">4,000</text>

                    {/* Torque Curves */}
                    {selectedWellIds.map((wId, idx) => {
                      const color = WELL_COLORS[idx % WELL_COLORS.length];
                      const { torqueCurve } = generateWellCurves(wId, idx);
                      const points = torqueCurve.map(p => {
                        const x = 30 + (p.torque / 40) * 160;
                        const y = 10 + (p.depth / 4000) * 140;
                        return `${x},${y}`;
                      }).join(' ');

                      return (
                        <polyline
                          key={wId}
                          fill="none"
                          stroke={color.stroke}
                          strokeWidth="2"
                          strokeLinecap="round"
                          points={points}
                        />
                      );
                    })}
                  </svg>
                </div>

                {/* X Ticks */}
                <div className="flex justify-between px-6 text-[8px] text-slate-400 font-bold border-t border-slate-100 pt-1">
                  <span>0</span>
                  <span>10</span>
                  <span>20</span>
                  <span>30</span>
                  <span>40 Torque (kN-m)</span>
                </div>
              </div>

              {/* Chart 3: Mud Weight vs Depth */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Droplet className="w-4 h-4 text-slate-700" />
                    <h3 className="text-xs font-extrabold text-slate-900">Mud Weight vs Depth</h3>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">SG</span>
                </div>

                {/* SVG Step-wise Graph */}
                <div className="h-48 w-full relative py-2">
                  <div className="absolute left-0 top-1 text-[9px] font-bold text-slate-400">Depth (m)</div>

                  <svg className="w-full h-full" viewBox="0 0 200 160" preserveAspectRatio="none">
                    {/* Grid */}
                    <line x1="30" y1="10" x2="195" y2="10" stroke="#F1F5F9" strokeWidth="1" />
                    <line x1="30" y1="45" x2="195" y2="45" stroke="#F1F5F9" strokeWidth="1" />
                    <line x1="30" y1="80" x2="195" y2="80" stroke="#F1F5F9" strokeWidth="1" />
                    <line x1="30" y1="115" x2="195" y2="115" stroke="#F1F5F9" strokeWidth="1" />
                    <line x1="30" y1="150" x2="195" y2="150" stroke="#E2E8F0" strokeWidth="1" />
                    <line x1="30" y1="10" x2="30" y2="150" stroke="#E2E8F0" strokeWidth="1" />

                    {/* Depth Y Ticks */}
                    <text x="24" y="14" textAnchor="end" fill="#94A3B8" fontSize="7">0</text>
                    <text x="24" y="49" textAnchor="end" fill="#94A3B8" fontSize="7">1,000</text>
                    <text x="24" y="84" textAnchor="end" fill="#94A3B8" fontSize="7">2,000</text>
                    <text x="24" y="119" textAnchor="end" fill="#94A3B8" fontSize="7">3,000</text>
                    <text x="24" y="153" textAnchor="end" fill="#94A3B8" fontSize="7">4,000</text>

                    {/* Mud Weight Step-curves */}
                    {selectedWellIds.map((wId, idx) => {
                      const color = WELL_COLORS[idx % WELL_COLORS.length];
                      const { mudWeightCurve } = generateWellCurves(wId, idx);
                      const points = mudWeightCurve.map(p => {
                        const x = 30 + ((p.mudWeight - 0.8) / 1.0) * 160;
                        const y = 10 + (p.depth / 4000) * 140;
                        return `${x},${y}`;
                      }).join(' ');

                      return (
                        <polyline
                          key={wId}
                          fill="none"
                          stroke={color.stroke}
                          strokeWidth="2"
                          strokeLinecap="square"
                          points={points}
                        />
                      );
                    })}
                  </svg>
                </div>

                {/* X Ticks */}
                <div className="flex justify-between px-6 text-[8px] text-slate-400 font-bold border-t border-slate-100 pt-1">
                  <span>0.8</span>
                  <span>1.0</span>
                  <span>1.2</span>
                  <span>1.4</span>
                  <span>1.6</span>
                  <span>1.8 SG</span>
                </div>
              </div>

            </div>

            {/* Right Panel: Correlation Insights (3 Cols) matching cross well corelation.png */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3 flex flex-col justify-between">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Correlation Insights</h3>
              </div>

              {/* 4 Insight Cards */}
              <div className="space-y-2.5 flex-1">
                {/* Insight 1 */}
                <div className="p-2.5 rounded-lg bg-red-50/60 border border-red-200/70 space-y-1">
                  <div className="flex items-center gap-1.5 text-red-700 font-bold text-xs">
                    <Droplet className="w-3.5 h-3.5 text-red-600" />
                    <span>Similar mud-loss pattern</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    DKG-231 and DKG-215 show mud loss at 3,200 – 3,400 m within Barail formation, similar to DKG-247.
                  </p>
                </div>

                {/* Insight 2 */}
                <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/70 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-700 font-bold text-xs">
                    <Cog className="w-3.5 h-3.5 text-amber-600" />
                    <span>High torque zone</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    Torque spikes observed in DKG-231 and MKG-118 between 3,400 – 3,700 m.
                  </p>
                </div>

                {/* Insight 3 */}
                <div className="p-2.5 rounded-lg bg-purple-50/60 border border-purple-200/70 space-y-1">
                  <div className="flex items-center gap-1.5 text-purple-700 font-bold text-xs">
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    <span>Formation behaviour</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    Barail formation shows comparable ROP decline across all correlated offset wells.
                  </p>
                </div>

                {/* Insight 4 */}
                <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200/70 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Recommended Action</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    Monitor mud weight and torque closely when approaching 3,200 m – 3,700 m.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* MIDDLE ROW: FORMATION CORRELATION COLUMNS & EVENT SCATTER PLOT */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Left: Formation Correlation Stratigraphic Columns (6 Cols) */}
            <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-700" />
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Formation Correlation</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold">Stratigraphic Tracks</span>
              </div>

              {/* Multi-Well Stratigraphic Columns */}
              <div className="flex items-stretch gap-4 pt-2">
                
                {/* Depth Scale on Left */}
                <div className="flex flex-col justify-between text-[8px] text-slate-400 font-bold pr-1 border-r border-slate-200 h-64 py-1 text-right w-10 flex-shrink-0">
                  <span>0 m</span>
                  <span>1,000 m</span>
                  <span>2,000 m</span>
                  <span>3,000 m</span>
                  <span>4,000 m</span>
                </div>

                {/* Columns for each well */}
                <div className="flex-1 grid grid-cols-4 gap-2 h-64">
                  {selectedWellIds.map((wId, idx) => {
                    const well = wellDataMap[wId];
                    const tops = well?.formation_tops && well.formation_tops.length > 0 
                      ? well.formation_tops 
                      : DEFAULT_FORMATION_TOPS;

                    return (
                      <div key={wId} className="flex flex-col h-full">
                        <div className="text-center pb-1 text-[11px] font-bold text-slate-800 truncate">
                          {wId}
                        </div>
                        <div className="flex-1 w-full rounded-md border border-slate-200 overflow-hidden flex flex-col bg-slate-50">
                          {DEFAULT_FORMATION_TOPS.map((ft) => {
                            const pal = FORMATION_PALETTE[ft.formation] || FORMATION_PALETTE['Barail'];
                            const heightPercent = ((ft.bottom_md - ft.top_md) / 4000) * 100;

                            return (
                              <div
                                key={ft.formation}
                                style={{ 
                                  height: `${heightPercent}%`, 
                                  backgroundColor: pal.bg,
                                  borderBottom: '1px solid rgba(0,0,0,0.06)'
                                }}
                                className="w-full flex items-center justify-center text-[9px] font-bold truncate px-1 transition-all hover:opacity-90"
                                title={`${ft.formation} (${ft.top_md}–${ft.bottom_md} m)`}
                              >
                                <span style={{ color: pal.text }} className="truncate">
                                  {ft.formation}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Stratigraphic Legend on Right */}
                <div className="flex flex-col justify-center gap-1 text-[9px] font-bold text-slate-600 pl-2 flex-shrink-0">
                  {Object.entries(FORMATION_PALETTE).slice(0, 6).map(([name, pal]) => (
                    <div key={name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs border" style={{ backgroundColor: pal.bg, borderColor: pal.border }} />
                      <span>{name}</span>
                    </div>
                  ))}
                </div>

              </div>
            </div>

            {/* Right: Event Correlation Aligned by Depth (6 Cols) */}
            <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slate-700" />
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Event Correlation (Aligned by Depth)</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold">Depth Markers</span>
              </div>

              {/* Event Scatter Grid */}
              <div className="h-64 flex flex-col justify-between py-2">
                <div className="flex-1 space-y-3">
                  {selectedWellIds.map((wId, idx) => (
                    <div key={wId} className="flex items-center gap-3">
                      <span className="text-[11px] font-bold text-slate-700 w-16 text-right truncate">{wId}</span>
                      
                      {/* Timeline track */}
                      <div className="flex-1 h-7 bg-[#F8FAFC] border border-slate-200 rounded-md relative flex items-center">
                        {/* Grid ticks */}
                        <div className="absolute inset-0 flex justify-between px-4 pointer-events-none opacity-20">
                          <span className="border-r border-slate-400 h-full" />
                          <span className="border-r border-slate-400 h-full" />
                          <span className="border-r border-slate-400 h-full" />
                        </div>

                        {/* Event Markers plotted by depth */}
                        {/* 1. Mud Loss */}
                        <span 
                          style={{ left: `${(3240 / 4000) * 100}%` }} 
                          className="absolute text-red-600 text-xs font-bold cursor-pointer hover:scale-125 transition-transform"
                          title="Mud Loss @ 3,240 m"
                        >
                          ▲
                        </span>

                        {/* 2. High Torque */}
                        <span 
                          style={{ left: `${(3480 / 4000) * 100}%` }} 
                          className="absolute text-amber-500 text-xs font-bold cursor-pointer hover:scale-125 transition-transform"
                          title="High Torque @ 3,480 m"
                        >
                          ●
                        </span>

                        {/* 3. Kick */}
                        {idx % 2 === 0 && (
                          <span 
                            style={{ left: `${(2150 / 4000) * 100}%` }} 
                            className="absolute text-blue-600 text-xs font-bold cursor-pointer hover:scale-125 transition-transform"
                            title="Gas Kick @ 2,150 m"
                          >
                            ◆
                          </span>
                        )}

                        {/* 4. Casing Issue */}
                        {idx === 1 && (
                          <span 
                            style={{ left: `${(2700 / 4000) * 100}%` }} 
                            className="absolute text-emerald-600 text-xs font-bold cursor-pointer hover:scale-125 transition-transform"
                            title="Casing Wear @ 2,700 m"
                          >
                            ■
                          </span>
                        )}

                        {/* 5. Pressure Anomaly */}
                        {idx === 3 && (
                          <span 
                            style={{ left: `${(3100 / 4000) * 100}%` }} 
                            className="absolute text-purple-600 text-xs font-bold cursor-pointer hover:scale-125 transition-transform"
                            title="Pressure Spike @ 3,100 m"
                          >
                            ✕
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* X Depth axis */}
                <div className="flex justify-between pl-20 pr-4 text-[9px] text-slate-400 font-bold border-t border-slate-100 pt-1">
                  <span>0 m</span>
                  <span>1,000 m</span>
                  <span>2,000 m</span>
                  <span>3,000 m</span>
                  <span>4,000 m Depth (m)</span>
                </div>

                {/* Event Legend */}
                <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-slate-600 pt-2 flex-wrap">
                  <span className="flex items-center gap-1 text-red-600">▲ Mud Loss</span>
                  <span className="flex items-center gap-1 text-amber-600">● High Torque</span>
                  <span className="flex items-center gap-1 text-blue-600">◆ Kick</span>
                  <span className="flex items-center gap-1 text-emerald-600">■ Casing Issue</span>
                  <span className="flex items-center gap-1 text-purple-600">✕ Pressure Anomaly</span>
                </div>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* BOTTOM ROW: KEY FINDINGS TABLE & SIMILAR WELL RECOMMENDATIONS */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Left: Key Correlation Findings Table (7 Cols) */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <FileText className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Key Correlation Findings</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      <th className="pb-2">Depth Range (m)</th>
                      <th className="pb-2">Formation</th>
                      <th className="pb-2">Similar Behaviour</th>
                      <th className="pb-2">Wells Involved</th>
                      <th className="pb-2">Event Type</th>
                      <th className="pb-2">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {findings.map((f, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 font-bold text-slate-900">{f.depth}</td>
                        <td className="py-2.5 text-slate-700 font-semibold">{f.formation}</td>
                        <td className="py-2.5 text-slate-600">{f.behavior}</td>
                        <td className="py-2.5 text-blue-600 font-medium">{f.wells}</td>
                        <td className="py-2.5 text-slate-700">{f.event}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${f.riskColor}`}>
                            {f.risk}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Similar Well Recommendations & Action Buttons (5 Cols) */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Similar Well Recommendations</h3>
                </div>

                <div className="space-y-2 pt-2">
                  {[
                    'Review DKG-231 mud loss mitigation strategy (3,200 – 3,400 m).',
                    'Check DKG-215 torque management practices (3,400 – 3,700 m).',
                    'Monitor formation change indicators closely across offset wells.',
                    'Prepare contingency for mud loss and torque spikes prior to spudding.'
                  ].map((rec, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-2 bg-[#F8FAFC] rounded-lg border border-slate-200/60 text-[11px]">
                      <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-slate-700 font-medium leading-tight">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons Grid matching cross well corelation.png */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => navigate('/events')}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#0F172A] hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Event Details
                </button>

                <button
                  onClick={() => navigate(`/wells/${selectedWellIds[0] || 'DKG-247'}`)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                >
                  <Compass className="w-3.5 h-3.5" />
                  View Well Details
                </button>

                <button
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#DC2626] hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Generate Report
                </button>

                <button
                  onClick={() => navigate(`/ai?q=Cross-well correlation summary for ${selectedWellIds.join(', ')}`)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all shadow-xs"
                >
                  <Bot className="w-3.5 h-3.5 text-blue-600" />
                  Ask NWIS
                </button>
              </div>

            </div>

          </div>

        </main>
      </div>
  );
}
