import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { wellsService, eventsService, predictionsService, documentsService, extractErrorMessage } from '../services/api';
import {
  TrendingUp,
  Layers,
  Activity,
  Clock,
  Flame,
  AlertTriangle,
  ChevronRight,
  Plus,
  X,
  FileText,
  MessageSquare,
  ShieldAlert,
  MapPin,
  Search,
  ExternalLink,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Calendar,
  Eye,
  Info
} from 'lucide-react';

export default function OffsetWellComparison() {
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(false);
  const [allAvailableWells, setAllAvailableWells] = useState([]);
  
  // Current primary reference well
  const [currentWellId, setCurrentWellId] = useState('DUL-235');
  
  // Selected offset wells for comparison (up to 3)
  const [selectedOffsetIds, setSelectedOffsetIds] = useState(['DUL-201', 'DUL-205', 'DUL-198']);
  
  // Dropdown filter controls
  const [formationFilter, setFormationFilter] = useState('All');
  const [depthRange, setDepthRange] = useState('0 - 4,000');
  const [parametersFilter, setParametersFilter] = useState('Key Parameters (4)');
  const [addWellModalOpen, setAddWellModalOpen] = useState(false);

  // Wells dataset
  const [wellsData, setWellsData] = useState({
    'DUL-235': {
      id: 'DUL-235',
      well_name: 'DUL-235',
      status: 'Active Drilling',
      field_name: 'Duliajan',
      operational_area: 'Duliajan',
      formation: 'Barail',
      total_depth_md: 3842,
      target_depth: 4200,
      npt_hours: 4.5,
      total_events: 7,
      mud_loss_count: 1,
      high_torque_count: 2,
      risk_level: 'Medium',
      distance_km: 0,
      key_events: 'High Torque (2), Mud Loss (1)',
      color: '#10B981', // green
      badgeColor: 'bg-emerald-100 text-emerald-700',
      rop_points: [12, 14, 18, 22, 28, 24, 19, 15],
      torque_points: [8, 10, 14, 18, 26, 22, 18, 14],
      mud_weight_points: [1.05, 1.10, 1.15, 1.18, 1.25, 1.35, 1.45, 1.50],
      events_timeline: [
        { depth: 850, type: 'Mud Loss', color: '#E11D48', shape: 'triangle' },
        { depth: 1600, type: 'Casing Issue', color: '#10B981', shape: 'square' },
        { depth: 2700, type: 'High Torque', color: '#F59E0B', shape: 'circle' },
        { depth: 3100, type: 'Mud Loss', color: '#E11D48', shape: 'triangle' },
        { depth: 3450, type: 'Pressure Anomaly', color: '#8B5CF6', shape: 'cross' }
      ]
    },
    'DUL-201': {
      id: 'DUL-201',
      well_name: 'DUL-201',
      status: 'Completed',
      field_name: 'Duliajan',
      operational_area: 'Duliajan',
      formation: 'Barail',
      total_depth_md: 3910,
      target_depth: 4000,
      npt_hours: 11.2,
      total_events: 9,
      mud_loss_count: 3,
      high_torque_count: 3,
      risk_level: 'High',
      distance_km: 3.2,
      key_events: 'Mud Loss (3), High Torque (3)',
      color: '#0070F3', // blue
      badgeColor: 'bg-blue-100 text-blue-700',
      rop_points: [10, 16, 20, 26, 32, 28, 22, 16],
      torque_points: [6, 9, 12, 22, 34, 28, 20, 16],
      mud_weight_points: [1.02, 1.08, 1.12, 1.20, 1.32, 1.48, 1.58, 1.62],
      events_timeline: [
        { depth: 400, type: 'Kick', color: '#0070F3', shape: 'diamond' },
        { depth: 1100, type: 'High Torque', color: '#F59E0B', shape: 'circle' },
        { depth: 1700, type: 'Pressure Anomaly', color: '#8B5CF6', shape: 'cross' },
        { depth: 2500, type: 'Kick', color: '#0070F3', shape: 'diamond' },
        { depth: 3240, type: 'Mud Loss', color: '#E11D48', shape: 'triangle' }
      ]
    },
    'DUL-205': {
      id: 'DUL-205',
      well_name: 'DUL-205',
      status: 'Completed',
      field_name: 'Duliajan',
      operational_area: 'Duliajan',
      formation: 'Barail',
      total_depth_md: 3775,
      target_depth: 3850,
      npt_hours: 7.4,
      total_events: 8,
      mud_loss_count: 2,
      high_torque_count: 2,
      risk_level: 'High',
      distance_km: 3.4,
      key_events: 'Mud Loss (2), High Torque (2)',
      color: '#E11D48', // red
      badgeColor: 'bg-red-100 text-red-700',
      rop_points: [14, 18, 24, 30, 36, 30, 24, 18],
      torque_points: [8, 12, 16, 24, 30, 24, 18, 14],
      mud_weight_points: [1.04, 1.10, 1.16, 1.24, 1.36, 1.50, 1.60, 1.65],
      events_timeline: [
        { depth: 950, type: 'Mud Loss', color: '#E11D48', shape: 'triangle' },
        { depth: 1200, type: 'Pressure Anomaly', color: '#8B5CF6', shape: 'cross' },
        { depth: 2400, type: 'Casing Issue', color: '#10B981', shape: 'square' },
        { depth: 3000, type: 'High Torque', color: '#F59E0B', shape: 'circle' },
        { depth: 3450, type: 'Mud Loss', color: '#E11D48', shape: 'triangle' }
      ]
    },
    'DUL-198': {
      id: 'DUL-198',
      well_name: 'DUL-198',
      status: 'Completed',
      field_name: 'Duliajan',
      operational_area: 'Duliajan',
      formation: 'Tipam/Barail',
      total_depth_md: 3680,
      target_depth: 3750,
      npt_hours: 5.1,
      total_events: 6,
      mud_loss_count: 1,
      high_torque_count: 1,
      risk_level: 'Medium',
      distance_km: 4.8,
      key_events: 'Casing Issue (1), Mud Loss (1)',
      color: '#F59E0B', // orange
      badgeColor: 'bg-amber-100 text-amber-700',
      rop_points: [12, 16, 20, 26, 30, 26, 20, 16],
      torque_points: [6, 10, 14, 18, 22, 18, 14, 10],
      mud_weight_points: [1.02, 1.06, 1.12, 1.18, 1.28, 1.38, 1.48, 1.55],
      events_timeline: [
        { depth: 700, type: 'Mud Loss', color: '#E11D48', shape: 'triangle' },
        { depth: 2000, type: 'High Torque', color: '#F59E0B', shape: 'circle' },
        { depth: 2900, type: 'Pressure Anomaly', color: '#8B5CF6', shape: 'cross' },
        { depth: 3300, type: 'High Torque', color: '#F59E0B', shape: 'circle' }
      ]
    },
    'DUL-176': {
      id: 'DUL-176',
      well_name: 'DUL-176',
      status: 'Standby',
      field_name: 'Duliajan',
      operational_area: 'Duliajan',
      formation: 'Barail',
      total_depth_md: 4100,
      target_depth: 4200,
      npt_hours: 8.9,
      total_events: 5,
      mud_loss_count: 2,
      high_torque_count: 2,
      risk_level: 'Medium',
      distance_km: 6.1,
      key_events: 'High Torque (2), Mud Loss (2)',
      color: '#8B5CF6',
      badgeColor: 'bg-purple-100 text-purple-700'
    },
    'DUL-190': {
      id: 'DUL-190',
      well_name: 'DUL-190',
      status: 'Completed',
      field_name: 'Duliajan',
      operational_area: 'Duliajan',
      formation: 'Barail',
      total_depth_md: 3890,
      target_depth: 3950,
      npt_hours: 3.8,
      total_events: 4,
      mud_loss_count: 1,
      high_torque_count: 1,
      risk_level: 'Low',
      distance_km: 7.4,
      key_events: 'Lost Circulation (1)',
      color: '#64748B',
      badgeColor: 'bg-slate-100 text-slate-700'
    }
  });

  // Fetch real wells list on mount
  useEffect(() => {
    const fetchWells = async () => {
      setLoading(true);
      try {
        const response = await wellsService.getAll({ page_size: 20 });
        if (response && response.wells) {
          setAllAvailableWells(response.wells);
        }
      } catch (err) {
        console.warn('Error fetching wells for comparison:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWells();
  }, []);

  // Active current well object
  const currentWell = wellsData[currentWellId] || wellsData['DUL-235'];

  // Active compared offset wells list
  const comparedWells = useMemo(() => {
    return selectedOffsetIds.map(id => wellsData[id]).filter(Boolean);
  }, [selectedOffsetIds, wellsData]);

  // Remove offset well from comparison
  const handleRemoveOffset = (idToRemove) => {
    setSelectedOffsetIds(prev => prev.filter(id => id !== idToRemove));
  };

  // Add offset well
  const handleAddOffset = (idToAdd) => {
    if (!selectedOffsetIds.includes(idToAdd) && selectedOffsetIds.length < 4) {
      setSelectedOffsetIds(prev => [...prev, idToAdd]);
    }
    setAddWellModalOpen(false);
  };

  return (
    <>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F4F6F9]">
        {/* Header */}
        <Header />

        {/* Scrollable Page Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Breadcrumb & Subheader */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>Well Intelligence</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-800 font-semibold">Offset Comparison</span>
              </div>
              <h1 className="text-2xl font-bold text-[#0B1527] tracking-tight mt-0.5">
                Offset Well Comparison
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Compare drilling behaviour, events and operational history across relevant wells
              </p>
            </div>
          </div>

          {/* Top Control Bar: Current Well Selector & Offset Well Pills */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Current Well Selection */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Current Well
                </label>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-950">{currentWell.well_name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-200/80 text-emerald-800">
                    {currentWell.status}
                  </span>
                </div>
              </div>

              {/* Compare with Offset Wells Pills */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Compare with Offset Wells
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {comparedWells.map((well) => (
                    <div
                      key={well.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-xs"
                      style={{
                        backgroundColor: `${well.color}10`,
                        borderColor: `${well.color}40`,
                        color: '#0B1527'
                      }}
                    >
                      <MapPin className="w-3.5 h-3.5" style={{ color: well.color }} />
                      <span>{well.well_name}</span>
                      <span className="text-[10px] text-slate-500 font-mono font-normal">
                        {well.distance_km} km
                      </span>
                      <button
                        onClick={() => handleRemoveOffset(well.id)}
                        className="text-slate-400 hover:text-slate-700 ml-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add Well Button */}
                  {selectedOffsetIds.length < 4 && (
                    <button
                      onClick={() => setAddWellModalOpen(true)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:border-slate-400 transition"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#0070F3]" />
                      <span>Add Well</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Dropdown Filters & Synchronize Button */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Formation</label>
                <select
                  value={formationFilter}
                  onChange={(e) => setFormationFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="All">All</option>
                  <option value="Barail">Barail</option>
                  <option value="Tipam">Tipam</option>
                  <option value="Girujan">Girujan</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Depth Range (m)</label>
                <select
                  value={depthRange}
                  onChange={(e) => setDepthRange(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="0 - 4,000">0 – 4,000</option>
                  <option value="2,000 - 3,500">2,000 – 3,500</option>
                  <option value="3,000 - 4,000">3,000 – 4,000</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Parameters</label>
                <select
                  value={parametersFilter}
                  onChange={(e) => setParametersFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="Key Parameters (4)">Key Parameters (4)</option>
                  <option value="All Parameters">All Parameters</option>
                  <option value="Hydraulics">Hydraulics</option>
                </select>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => {}}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0B1527] text-white text-xs font-bold rounded-xl hover:bg-[#1E293B] transition shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Synchronize Depth</span>
                </button>
              </div>
            </div>
          </div>

          {/* 6 Top Comparison KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* Card 1: Total Depth */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-3.5 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-1">
                <Layers className="w-3.5 h-3.5 text-[#0070F3]" />
                <span>Total Depth (m)</span>
              </div>
              <div className="text-xl font-black text-[#0B1527] font-mono">
                {currentWell.total_depth_md.toLocaleString()}
                <span className="text-[10px] text-slate-400 font-normal block">{currentWell.well_name}</span>
              </div>
              <div className="space-y-1 text-[10px] text-slate-500 pt-2 border-t border-slate-100 font-mono">
                {comparedWells.map((w) => (
                  <div key={w.id} className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: w.color }}></div>
                      <strong>{w.total_depth_md.toLocaleString()}</strong>
                    </span>
                    <span className="text-slate-400">{w.well_name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 2: Total Events */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-3.5 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-1">
                <Activity className="w-3.5 h-3.5 text-red-500" />
                <span>Total Events</span>
              </div>
              <div className="text-xl font-black text-[#0B1527] font-mono">
                {currentWell.total_events}
                <span className="text-[10px] text-slate-400 font-normal block">{currentWell.well_name}</span>
              </div>
              <div className="space-y-1 text-[10px] text-slate-500 pt-2 border-t border-slate-100 font-mono">
                {comparedWells.map((w) => (
                  <div key={w.id} className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: w.color }}></div>
                      <strong>{w.total_events}</strong>
                    </span>
                    <span className="text-slate-400">{w.well_name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3: NPT Hours */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-3.5 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-1">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>NPT Hours (hr)</span>
              </div>
              <div className="text-xl font-black text-[#0B1527] font-mono">
                {currentWell.npt_hours}
                <span className="text-[10px] text-slate-400 font-normal block">{currentWell.well_name}</span>
              </div>
              <div className="space-y-1 text-[10px] text-slate-500 pt-2 border-t border-slate-100 font-mono">
                {comparedWells.map((w) => (
                  <div key={w.id} className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: w.color }}></div>
                      <strong>{w.npt_hours}</strong>
                    </span>
                    <span className="text-slate-400">{w.well_name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 4: Mud Loss Incidents */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-3.5 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-1">
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                <span>Mud Loss Incidents</span>
              </div>
              <div className="text-xl font-black text-[#0B1527] font-mono">
                {currentWell.mud_loss_count}
                <span className="text-[10px] text-slate-400 font-normal block">{currentWell.well_name}</span>
              </div>
              <div className="space-y-1 text-[10px] text-slate-500 pt-2 border-t border-slate-100 font-mono">
                {comparedWells.map((w) => (
                  <div key={w.id} className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: w.color }}></div>
                      <strong>{w.mud_loss_count}</strong>
                    </span>
                    <span className="text-slate-400">{w.well_name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 5: High Torque Incidents */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-3.5 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                <span>High Torque Incidents</span>
              </div>
              <div className="text-xl font-black text-[#0B1527] font-mono">
                {currentWell.high_torque_count}
                <span className="text-[10px] text-slate-400 font-normal block">{currentWell.well_name}</span>
              </div>
              <div className="space-y-1 text-[10px] text-slate-500 pt-2 border-t border-slate-100 font-mono">
                {comparedWells.map((w) => (
                  <div key={w.id} className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: w.color }}></div>
                      <strong>{w.high_torque_count}</strong>
                    </span>
                    <span className="text-slate-400">{w.well_name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 6: Overall Risk Level */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-3.5 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                <span>Overall Risk Level</span>
              </div>
              <div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                  {currentWell.risk_level}
                </span>
                <span className="text-[10px] text-slate-400 font-normal block mt-1">{currentWell.well_name}</span>
              </div>
              <div className="space-y-1 text-[10px] text-slate-500 pt-2 border-t border-slate-100 font-mono">
                {comparedWells.map((w) => (
                  <div key={w.id} className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: w.color }}></div>
                      <strong className={w.risk_level === 'High' ? 'text-red-600' : 'text-amber-600'}>{w.risk_level}</strong>
                    </span>
                    <span className="text-slate-400">{w.well_name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Telemetry Charts & Comparison Insight Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* 3 Telemetry Charts (8 Cols / 68%) */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3">
              {/* Legend Strip */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-700 pb-2 border-b border-slate-100">
                <span className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></div>
                  <span>{currentWell.well_name} (Current Well)</span>
                </span>
                {comparedWells.map((w) => (
                  <span key={w.id} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: w.color }}></div>
                    <span>{w.well_name} (Offset)</span>
                  </span>
                ))}
              </div>

              {/* 3 Charts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Chart 1: Depth vs ROP */}
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <div className="text-xs font-bold text-[#0B1527]">Depth vs ROP</div>
                  <div className="h-32 relative">
                    <svg viewBox="0 0 200 100" className="w-full h-full">
                      {/* Grid lines */}
                      <line x1="20" y1="20" x2="190" y2="20" stroke="#E2E8F0" strokeWidth="0.5" />
                      <line x1="20" y1="50" x2="190" y2="50" stroke="#E2E8F0" strokeWidth="0.5" />
                      <line x1="20" y1="80" x2="190" y2="80" stroke="#E2E8F0" strokeWidth="0.5" />
                      
                      {/* DUL-235 (green) */}
                      <path d="M 20 80 Q 70 70 110 40 T 190 60" fill="none" stroke="#10B981" strokeWidth="2" />
                      {/* DUL-201 (blue) */}
                      <path d="M 20 75 Q 80 60 120 25 T 190 55" fill="none" stroke="#0070F3" strokeWidth="1.5" />
                      {/* DUL-205 (red) */}
                      <path d="M 20 70 Q 90 50 130 30 T 190 50" fill="none" stroke="#E11D48" strokeWidth="1.5" />
                      {/* DUL-198 (orange) */}
                      <path d="M 20 85 Q 70 75 110 50 T 190 70" fill="none" stroke="#F59E0B" strokeWidth="1.5" />
                    </svg>
                    <div className="flex justify-between text-[8px] text-slate-400 font-mono mt-0.5">
                      <span>0</span>
                      <span>1,000</span>
                      <span>2,000</span>
                      <span>3,000</span>
                      <span>4,000 m</span>
                    </div>
                  </div>
                </div>

                {/* Chart 2: Torque vs Depth */}
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <div className="text-xs font-bold text-[#0B1527]">Torque vs Depth</div>
                  <div className="h-32 relative">
                    <svg viewBox="0 0 200 100" className="w-full h-full">
                      <line x1="20" y1="20" x2="190" y2="20" stroke="#E2E8F0" strokeWidth="0.5" />
                      <line x1="20" y1="50" x2="190" y2="50" stroke="#E2E8F0" strokeWidth="0.5" />
                      <line x1="20" y1="80" x2="190" y2="80" stroke="#E2E8F0" strokeWidth="0.5" />
                      
                      {/* Curves */}
                      <path d="M 20 85 Q 90 80 130 40 T 190 65" fill="none" stroke="#10B981" strokeWidth="2" />
                      <path d="M 20 90 Q 100 70 135 20 T 190 70" fill="none" stroke="#0070F3" strokeWidth="1.5" />
                      <path d="M 20 80 Q 90 75 130 35 T 190 60" fill="none" stroke="#E11D48" strokeWidth="1.5" />
                      <path d="M 20 75 Q 80 65 120 50 T 190 75" fill="none" stroke="#F59E0B" strokeWidth="1.5" />
                    </svg>
                    <div className="flex justify-between text-[8px] text-slate-400 font-mono mt-0.5">
                      <span>0</span>
                      <span>1,000</span>
                      <span>2,000</span>
                      <span>3,000</span>
                      <span>4,000 m</span>
                    </div>
                  </div>
                </div>

                {/* Chart 3: Mud Weight vs Depth */}
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <div className="text-xs font-bold text-[#0B1527]">Mud Weight vs Depth</div>
                  <div className="h-32 relative">
                    <svg viewBox="0 0 200 100" className="w-full h-full">
                      <line x1="20" y1="20" x2="190" y2="20" stroke="#E2E8F0" strokeWidth="0.5" />
                      <line x1="20" y1="50" x2="190" y2="50" stroke="#E2E8F0" strokeWidth="0.5" />
                      <line x1="20" y1="80" x2="190" y2="80" stroke="#E2E8F0" strokeWidth="0.5" />
                      
                      {/* Gradual mud weight ramps */}
                      <path d="M 20 85 L 70 80 L 120 65 L 150 45 L 190 35" fill="none" stroke="#10B981" strokeWidth="2" />
                      <path d="M 20 88 L 70 82 L 120 60 L 150 40 L 190 30" fill="none" stroke="#0070F3" strokeWidth="1.5" />
                      <path d="M 20 82 L 70 78 L 120 55 L 150 35 L 190 28" fill="none" stroke="#E11D48" strokeWidth="1.5" />
                      <path d="M 20 90 L 70 85 L 120 68 L 150 50 L 190 40" fill="none" stroke="#F59E0B" strokeWidth="1.5" />
                    </svg>
                    <div className="flex justify-between text-[8px] text-slate-400 font-mono mt-0.5">
                      <span>0</span>
                      <span>1,000</span>
                      <span>2,000</span>
                      <span>3,000</span>
                      <span>4,000 m</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* NWIS Comparison Insight (4 Cols / 32%) */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527] pb-2 border-b border-slate-100">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>NWIS Comparison Insight</span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed mt-2">
                  <strong>DUL-201</strong> and <strong>DUL-205</strong> show similar high-torque and mud-loss patterns at comparable depths within the <strong>Barail</strong> formation, which may indicate a potential risk for <strong>DUL-235</strong> as it approaches 3,500 – 3,800 m.
                </p>

                <div className="space-y-1.5 text-xs text-slate-600 mt-2.5">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></div>
                    <span>Mud loss events observed in 3 offset wells at 3,200 – 3,400 m.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></div>
                    <span>High torque spikes in DUL-201 and DUL-205 between 3,400 – 3,700 m.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></div>
                    <span>Similar formation progression across all wells.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></div>
                    <span>Recommended to monitor torque and mud properties closely in the upcoming depth range.</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 font-medium mb-2">
                  Evidence from 5 documents | 3 nearby wells
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => navigate('/ai/evidence')}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 bg-[#0B1527] text-white text-[10px] font-bold rounded-lg hover:bg-[#1E293B] transition"
                  >
                    <FileText className="w-3 h-3" />
                    <span>View Evidence</span>
                  </button>

                  <button
                    onClick={() => navigate('/risk')}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 bg-[#E11D48] text-white text-[10px] font-bold rounded-lg hover:bg-rose-700 transition"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>Run Risk Analysis</span>
                  </button>

                  <button
                    onClick={() => navigate('/ai')}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Ask NWIS</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Lower Correlation Matrix: Event Timeline (45%) | Formation Correlation (30%) | Key Takeaways (25%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Event Timeline Aligned by Depth (6 Cols / 48%) */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527]">
                  <Activity className="w-4 h-4 text-[#0070F3]" />
                  <span>Event Timeline <span className="font-normal text-slate-400">(Aligned by Depth)</span></span>
                </div>
              </div>

              {/* Rows for each well */}
              <div className="space-y-3 pt-1">
                {[currentWell, ...comparedWells].map((well) => (
                  <div key={well.id} className="flex items-center gap-3 text-xs">
                    <span className="w-16 font-bold text-[#0B1527] text-[11px] truncate">{well.well_name}</span>
                    <div className="flex-1 h-7 bg-slate-50 border border-slate-200 rounded-lg relative overflow-hidden flex items-center px-2">
                      {/* Marker points along depth axis */}
                      {well.events_timeline?.map((ev, i) => (
                        <div
                          key={i}
                          className="absolute -translate-x-1/2 flex items-center justify-center"
                          style={{ left: `${(ev.depth / 4000) * 100}%` }}
                          title={`${ev.type} @ ${ev.depth} m`}
                        >
                          {ev.shape === 'triangle' && (
                            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px]" style={{ borderBottomColor: ev.color }}></div>
                          )}
                          {ev.shape === 'circle' && (
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ev.color }}></div>
                          )}
                          {ev.shape === 'diamond' && (
                            <div className="w-2 h-2 rotate-45" style={{ backgroundColor: ev.color }}></div>
                          )}
                          {ev.shape === 'square' && (
                            <div className="w-2 h-2" style={{ backgroundColor: ev.color }}></div>
                          )}
                          {ev.shape === 'cross' && (
                            <span className="font-bold text-[10px] leading-none" style={{ color: ev.color }}>✕</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Depth Scale */}
                <div className="flex justify-between text-[10px] text-slate-400 font-mono pl-20 pr-2">
                  <span>0</span>
                  <span>1,000</span>
                  <span>2,000</span>
                  <span>3,000</span>
                  <span>4,000 m</span>
                </div>

                {/* Event Symbols Legend */}
                <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-600 pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1"><div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[6px] border-b-red-500"></div> Mud Loss</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> High Torque</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rotate-45 bg-blue-500"></div> Kick</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500"></div> Casing Issue</span>
                  <span className="flex items-center gap-1"><span className="text-purple-500 font-bold">✕</span> Pressure Anomaly</span>
                </div>
              </div>
            </div>

            {/* Formation Correlation (4 Cols / 32%) */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527]">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Formation Correlation <span className="font-normal text-slate-400">(Depth vs Formation)</span></span>
                </div>
              </div>

              <div className="flex items-stretch gap-3 text-xs">
                {/* Vertical Depth Scale */}
                <div className="flex flex-col justify-between text-[9px] text-slate-400 font-mono py-1">
                  <span>0</span>
                  <span>500</span>
                  <span>1,000</span>
                  <span>1,500</span>
                  <span>2,000</span>
                  <span>2,500</span>
                  <span>3,000</span>
                  <span>3,500</span>
                  <span>4,000 m</span>
                </div>

                {/* Side-by-side well formation pillars */}
                <div className="flex-1 grid grid-cols-4 gap-1.5 text-center text-[8px] font-bold text-slate-700">
                  {[currentWell, ...comparedWells].map((w) => (
                    <div key={w.id} className="flex flex-col rounded-lg overflow-hidden border border-slate-200">
                      <div className="bg-slate-100 py-1 text-[9px] text-[#0B1527] font-extrabold truncate border-b border-slate-200">
                        {w.well_name}
                      </div>
                      <div className="h-5 bg-slate-100 border-b border-slate-200 flex items-center justify-center">Alluvium</div>
                      <div className="h-7 bg-amber-100/70 border-b border-slate-200 flex items-center justify-center">Dihing</div>
                      <div className="h-10 bg-blue-100/70 border-b border-slate-200 flex items-center justify-center">Tipam</div>
                      <div className="h-12 bg-indigo-100/70 border-b border-slate-200 flex items-center justify-center">Girujan</div>
                      <div className="h-14 bg-rose-100/80 border-b border-slate-200 flex items-center justify-center text-rose-900 font-black">Barail</div>
                      <div className="h-8 bg-amber-200/70 flex items-center justify-center">Kopili</div>
                    </div>
                  ))}
                </div>

                {/* Formations Legend */}
                <div className="flex flex-col justify-between text-[9px] text-slate-600 pl-1">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-slate-100 border"></div> Alluvium</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-amber-100"></div> Dihing</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-100"></div> Tipam</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-indigo-100"></div> Girujan</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-rose-200"></div> Barail</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-amber-200"></div> Kopili/Shale</span>
                </div>
              </div>
            </div>

            {/* Key Takeaways (2 Cols / 20%) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527] pb-2 border-b border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Key Takeaways</span>
              </div>

              <div className="space-y-2.5 text-[11px] text-slate-600">
                <div className="flex items-start gap-2">
                  <Layers className="w-3.5 h-3.5 text-[#0070F3] mt-0.5 flex-shrink-0" />
                  <span>Similar drilling behaviour in DUL-201 and DUL-205 within Barail formation.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Flame className="w-3.5 h-3.5 text-[#E11D48] mt-0.5 flex-shrink-0" />
                  <span>Higher mud-loss and torque incidents at 3,200 – 3,700 m.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Activity className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span>Monitor mud weight and torque closely for DUL-235.</span>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="w-3.5 h-3.5 text-indigo-600 mt-0.5 flex-shrink-0" />
                  <span>Review offset well mitigation strategies.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison Summary Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527]">
                <Layers className="w-4 h-4 text-[#0070F3]" />
                <span>Comparison Summary</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[10px]">
                    <th className="py-2.5 px-3">Well ID</th>
                    <th className="py-2.5 px-3">Distance (km)</th>
                    <th className="py-2.5 px-3">Field</th>
                    <th className="py-2.5 px-3">Formation (Target)</th>
                    <th className="py-2.5 px-3">Total Depth (m)</th>
                    <th className="py-2.5 px-3">NPT Hours (hr)</th>
                    <th className="py-2.5 px-3">Key Events</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-center">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {[currentWell, ...comparedWells].map((w, idx) => (
                    <tr
                      key={w.id}
                      onClick={() => navigate(`/wells/${w.id}`)}
                      className={`hover:bg-blue-50/40 transition cursor-pointer ${
                        idx === 0 ? 'bg-emerald-50/40 font-semibold' : ''
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: w.color }}></div>
                          <span className="font-bold text-[#0B1527] hover:text-[#0070F3]">{w.well_name}</span>
                          {idx === 0 && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800 font-bold">
                              Current
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">{w.distance_km === 0 ? '—' : w.distance_km}</td>
                      <td className="py-3 px-3 text-slate-700">{w.field_name}</td>
                      <td className="py-3 px-3 text-slate-800">{w.formation}</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{w.total_depth_md.toLocaleString()}</td>
                      <td className="py-3 px-3 font-mono text-slate-800">{w.npt_hours}</td>
                      <td className="py-3 px-3 text-slate-600 text-[11px]">{w.key_events}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          w.status === 'Active Drilling' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {w.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          w.risk_level === 'High' ? 'bg-red-100 text-red-700' :
                          w.risk_level === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {w.risk_level}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historical Lessons from Offset Wells (3 Cards) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527] pb-2 border-b border-slate-100">
              <FileText className="w-3.5 h-3.5 text-[#0070F3]" />
              <span>Historical Lessons from Offset Wells</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Lesson 1 */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527]">
                      <Flame className="w-4 h-4 text-[#E11D48]" />
                      <span>Mud Loss Pattern</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-700">
                      High
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Observed in 3 nearby wells at 3,200 – 3,400 m (Barail).
                  </p>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-2">
                  Source Wells: DUL-201, DUL-205, DUL-198
                </div>
              </div>

              {/* Lesson 2 */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527]">
                      <Activity className="w-4 h-4 text-amber-500" />
                      <span>High Torque Pattern</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700">
                      High
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Torque spikes between 3,400 – 3,700 m.
                  </p>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-2">
                  Source Wells: DUL-201, DUL-205
                </div>
              </div>

              {/* Lesson 3 */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527]">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      <span>NPT Pattern</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700">
                      Medium
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Higher NPT observed due to mud loss and torque issues.
                  </p>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-2">
                  Source Wells: DUL-201, DUL-205
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Well Modal */}
      {addWellModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm p-5 text-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-[#0B1527]">Add Offset Well to Comparison</h3>
              <button onClick={() => setAddWellModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {['DUL-176', 'DUL-190', 'DUL-164', 'DUL-221'].map((id) => (
                <div
                  key={id}
                  onClick={() => handleAddOffset(id)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 border border-slate-100 cursor-pointer transition"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#0070F3]" />
                    <span className="font-bold text-xs text-[#0B1527]">{id}</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#0070F3] bg-blue-100 px-2 py-0.5 rounded-md">
                    Add +
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
