import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { predictionsService, wellsService, eventsService, extractErrorMessage } from '../services/api';
import {
  ShieldAlert,
  AlertTriangle,
  Flame,
  Activity,
  ChevronRight,
  TrendingUp,
  FileText,
  MessageSquare,
  Sparkles,
  Layers,
  MapPin,
  Clock,
  CheckCircle2,
  Info,
  Loader2,
  ArrowRight,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export default function RiskAssessment() {
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(false);
  const [activeWell, setActiveWell] = useState({
    id: 'DUL-235',
    well_name: 'DUL-235',
    status: 'ACTIVE DRILLING',
    field_name: 'Duliajan',
    current_depth: 3842,
    target_depth: 4200,
    formation: 'Barail',
    well_type: 'Development'
  });

  const [riskData, setRiskData] = useState({
    overall_risk_level: 'MEDIUM',
    mud_loss_risk: 78,
    high_torque_risk: 62,
    overpressure_risk: 54,
    casing_wear_risk: 22,
    npt_risk: 65,
    key_drivers: [
      'Similar mud-loss events observed in 3 nearby wells (DUL-201, DUL-205, DUL-198)',
      'High-torque pattern in DUL-201 and DUL-205 between 3,400 – 3,700 m',
      'Current depth (3,842 m) is within Barail formation, similar to offset wells',
      'Historical NPT recorded in nearby wells due to mud loss and torque issues',
      '3 relevant offset wells within 5–10 km show comparable drilling behaviour'
    ]
  });

  // Call live risk endpoint on mount or when well changes
  useEffect(() => {
    const fetchRisk = async () => {
      setLoading(true);
      try {
        const response = await predictionsService.assessRisk({
          well_id: activeWell.id,
          current_depth: activeWell.current_depth,
          current_formation: activeWell.formation,
          drilling_params: {
            rop: 14.5,
            wob: 68,
            rpm: 120,
            mud_weight: 1.18
          }
        });
        if (response) {
          setRiskData((prev) => ({
            ...prev,
            overall_risk_level: response.overall_risk_level || 'MEDIUM',
            mud_loss_risk: Math.round((response.stuck_pipe_risk || 0.78) * 100),
            high_torque_risk: Math.round((response.lost_circulation_risk || 0.62) * 100),
            overpressure_risk: Math.round((response.well_control_risk || 0.54) * 100),
            casing_wear_risk: 22,
            npt_risk: 65
          }));
        }
      } catch (err) {
        console.warn('Using baseline risk profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRisk();
  }, [activeWell.id]);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F4F6F9]">
        {/* Header */}
        <Header />

        {/* Scrollable Page Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Breadcrumb & Title */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>Risk & Events</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-800 font-semibold">Risk Analysis</span>
              </div>
              <h1 className="text-2xl font-bold text-[#0B1527] tracking-tight mt-0.5">
                Risk Analysis
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Evidence-backed assessment of drilling risks using current well data and historical offset-well patterns
              </p>
            </div>
          </div>

          {/* Active Well Banner Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 border border-slate-200">
                <img src="/assets/well-hero-rig.png" alt="Rig" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-[#0B1527]">{activeWell.well_name}</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                    {activeWell.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-5 text-xs text-slate-600 mt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Field</span>
                    <strong className="text-slate-800">{activeWell.field_name}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Current Depth</span>
                    <strong className="text-slate-800 font-mono">{activeWell.current_depth.toLocaleString()} m</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Formation</span>
                    <strong className="text-slate-800">{activeWell.formation}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Well Type</span>
                    <strong className="text-slate-800">{activeWell.well_type}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/wells/${activeWell.id}`)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0B1527] text-white text-xs font-bold rounded-xl hover:bg-[#1E293B] transition shadow-sm"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>View Well Intelligence</span>
              </button>

              <button
                onClick={() => navigate('/comparison')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition shadow-sm"
              >
                <TrendingUp className="w-3.5 h-3.5 text-[#0070F3]" />
                <span>Compare Offset Wells</span>
              </button>

              <button
                onClick={() => navigate('/ai')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition shadow-sm"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Ask NWIS</span>
              </button>
            </div>
          </div>

          {/* Top 3 Analytical Cards: Overall Assessment (35%) | Key Risk Drivers (35%) | NWIS Risk Insight (30%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Card 1: Overall Risk Assessment (4 Cols / 34%) */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527]">
                  <ShieldAlert className="w-4 h-4 text-[#0070F3]" />
                  <span>Overall Risk Assessment</span>
                </div>
                <Info className="w-3.5 h-3.5 text-slate-400" />
              </div>

              <div className="flex items-center gap-4">
                {/* Donut Gauge */}
                <div className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#F1F5F9" strokeWidth="4" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#10B981" strokeWidth="4" strokeDasharray="30 70" strokeDashoffset="0" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#F59E0B" strokeWidth="4" strokeDasharray="45 55" strokeDashoffset="-30" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#E11D48" strokeWidth="4" strokeDasharray="25 75" strokeDashoffset="-75" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-sm font-black text-amber-600 leading-tight">{riskData.overall_risk_level}</span>
                    <span className="text-[8px] text-slate-400 font-bold uppercase">Overall Risk</span>
                  </div>
                </div>

                {/* Progress Bars */}
                <div className="flex-1 space-y-2 text-xs">
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <Flame className="w-3 h-3 text-red-500" />
                        <span>Mud Loss Risk</span>
                      </div>
                      <span className="font-bold text-red-600 text-[10px]">High</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-[#E11D48] h-full rounded-full" style={{ width: `${riskData.mud_loss_risk}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <Activity className="w-3 h-3 text-amber-500" />
                        <span>High Torque Risk</span>
                      </div>
                      <span className="font-bold text-amber-600 text-[10px]">Medium</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-[#F59E0B] h-full rounded-full" style={{ width: `${riskData.high_torque_risk}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        <span>Overpressure Risk</span>
                      </div>
                      <span className="font-bold text-amber-600 text-[10px]">Medium</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-[#F59E0B] h-full rounded-full" style={{ width: `${riskData.overpressure_risk}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <Layers className="w-3 h-3 text-emerald-500" />
                        <span>Casing Wear Risk</span>
                      </div>
                      <span className="font-bold text-emerald-600 text-[10px]">Low</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-[#10B981] h-full rounded-full" style={{ width: `${riskData.casing_wear_risk}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#10B981]"></div> Low Risk</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#F59E0B]"></div> Medium Risk</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#E11D48]"></div> High Risk</span>
              </div>
            </div>

            {/* Card 2: Key Risk Drivers (4 Cols / 34%) */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527] pb-2 border-b border-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Key Risk Drivers <span className="font-normal text-slate-400">(Based on Historical Evidence)</span></span>
              </div>

              <div className="space-y-2 text-xs text-slate-700">
                {riskData.key_drivers.map((driver, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 transition">
                    <div className="w-5 h-5 rounded bg-blue-50 text-[#0070F3] flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <span className="text-[11px] leading-snug">{driver}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3: NWIS Risk Insight (4 Cols / 32%) */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527]">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>NWIS Risk Insight</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-[#0070F3]">
                    Based on 3 nearby wells
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed mt-2">
                  Historical data from nearby wells indicates a moderate to high likelihood of mud-loss and high-torque events within the current depth and formation interval (Barail). Similar drilling behaviour was observed in DUL-201 and DUL-205 at 3,200 – 3,700 m.
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed mt-1.5">
                  It is recommended to review the relevant offset well reports and monitor key drilling parameters closely.
                </p>

                {/* 3 Action Buttons */}
                <div className="grid grid-cols-3 gap-1.5 mt-3">
                  <button
                    onClick={() => navigate('/ai/evidence')}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 bg-[#0B1527] text-white text-[10px] font-bold rounded-lg hover:bg-[#1E293B] transition"
                  >
                    <FileText className="w-3 h-3" />
                    <span>View Evidence</span>
                  </button>

                  <button
                    onClick={() => navigate('/comparison')}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 bg-[#E11D48] text-white text-[10px] font-bold rounded-lg hover:bg-rose-700 transition"
                  >
                    <TrendingUp className="w-3 h-3" />
                    <span>Compare Wells</span>
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

              {/* Evidence Coverage Widget */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4 text-center">
                  <div>
                    <div className="font-bold text-[#0B1527] text-sm">3</div>
                    <div className="text-[9px] text-slate-400 font-medium">Nearby Wells</div>
                  </div>
                  <div>
                    <div className="font-bold text-[#0B1527] text-sm">5</div>
                    <div className="text-[9px] text-slate-400 font-medium">Relevant Documents</div>
                  </div>
                  <div>
                    <div className="font-bold text-[#0B1527] text-sm">28</div>
                    <div className="text-[9px] text-slate-400 font-medium">Historical Events</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-black text-emerald-600">Good</div>
                  <div className="text-[9px] text-slate-400">Coverage</div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle 2 Panels: Depth-Based Risk Profile (65%) & Risk Timeline (35%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Depth-Based Risk Profile (8 Cols / 65%) */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527]">
                  <TrendingUp className="w-4 h-4 text-[#0070F3]" />
                  <span>Depth-Based Risk Profile <span className="font-normal text-slate-400">(Current Well with Historical Evidence)</span></span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-600">
                  <span className="flex items-center gap-1"><div className="w-3 h-0.5 bg-[#0070F3]"></div> Current Well (DUL-235)</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-2 bg-rose-200 border border-red-300"></div> Mud Loss Risk Zone</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-2 bg-amber-200 border border-amber-300"></div> High Torque Risk Zone</span>
                </div>
              </div>

              {/* Formations Ribbon */}
              <div className="grid grid-cols-6 text-center text-[9px] font-bold text-slate-700 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                <div className="py-1 bg-slate-100 border-r border-slate-200">Alluvium</div>
                <div className="py-1 bg-slate-100 border-r border-slate-200">Dihing</div>
                <div className="py-1 bg-amber-100/70 border-r border-slate-200">Tipam</div>
                <div className="py-1 bg-blue-100/70 border-r border-slate-200">Girujan</div>
                <div className="py-1 bg-rose-100/80 border-r border-slate-200 text-rose-900">Barail</div>
                <div className="py-1 bg-slate-200">Kopili/Shale</div>
              </div>

              {/* Trajectory Canvas with Hazard Zones */}
              <div className="relative h-44 w-full bg-slate-50/70 rounded-xl border border-slate-200/80 p-3 overflow-hidden">
                {/* Mud Loss Hazard Box */}
                <div className="absolute top-8 left-[45%] w-[20%] h-28 bg-rose-100/80 border-2 border-dashed border-rose-400 rounded-xl p-2 flex flex-col justify-center text-center">
                  <span className="text-[10px] font-bold text-rose-900">3,200 – 3,400 m</span>
                  <span className="text-[8px] font-medium text-rose-700">Mud Loss Pattern (Offset Wells)</span>
                </div>

                {/* High Torque Hazard Box */}
                <div className="absolute top-12 left-[68%] w-[20%] h-24 bg-amber-100/80 border-2 border-dashed border-amber-400 rounded-xl p-2 flex flex-col justify-center text-center">
                  <span className="text-[10px] font-bold text-amber-900">3,400 – 3,700 m</span>
                  <span className="text-[8px] font-medium text-amber-700">High Torque Pattern (Offset Wells)</span>
                </div>

                {/* SVG Curve for Well Trajectory */}
                <svg viewBox="0 0 500 120" className="w-full h-full">
                  <path
                    d="M 20 20 Q 150 40 250 65 T 450 100"
                    fill="none"
                    stroke="#0070F3"
                    strokeWidth="3"
                  />
                  {/* Current Bit Marker */}
                  <circle cx="450" cy="100" r="5" fill="#E11D48" stroke="#FFFFFF" strokeWidth="2" />
                </svg>

                {/* Current Depth Label */}
                <div className="absolute bottom-2 right-4 bg-[#0B1527] text-white px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                  3,842 m (Current Depth)
                </div>
              </div>
            </div>

            {/* Right: Risk Timeline (Depth View) (4 Cols / 35%) */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527] pb-2 border-b border-slate-100">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Risk Timeline <span className="font-normal text-slate-400">(Depth View)</span></span>
              </div>

              {/* Horizontal Depth Band */}
              <div className="space-y-3 pt-2">
                <div className="relative h-6 bg-slate-100 rounded-lg overflow-hidden flex">
                  <div className="w-[30%] bg-emerald-200/70" title="Low Risk Zone"></div>
                  <div className="w-[35%] bg-amber-300/80" title="Medium Torque Zone"></div>
                  <div className="w-[20%] bg-rose-400/80" title="High Loss Zone"></div>
                  <div className="w-[15%] bg-slate-200"></div>

                  {/* Marker for Current Depth */}
                  <div className="absolute right-[12%] top-0 bottom-0 w-1 bg-[#0B1527]"></div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>0 m</span>
                  <span>1,000 m</span>
                  <span>2,000 m</span>
                  <span>3,000 m</span>
                  <span className="font-bold text-[#0B1527]">3,842 m</span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#E11D48]"></div>
                    <span className="text-[11px]">Mud Loss Event (Historical @ 3,240 m)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></div>
                    <span className="text-[11px]">High Torque Event (Historical @ 3,450 m)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#0070F3]"></div>
                    <span className="text-[11px]">Current Bit Position (3,842 m)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lower 2 Tables: Offset Well Evidence (50%) & Recent Current-Well Signals (50%) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left: Offset Well Evidence (Nearby Wells) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527]">
                  <FileText className="w-4 h-4 text-[#0070F3]" />
                  <span>Offset Well Evidence (Nearby Wells)</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[10px]">
                      <th className="py-2 px-2.5">Well ID</th>
                      <th className="py-2 px-2.5">Distance</th>
                      <th className="py-2 px-2.5">Formation</th>
                      <th className="py-2 px-2.5">Depth Range</th>
                      <th className="py-2 px-2.5">Key Events</th>
                      <th className="py-2 px-2.5">NPT (hr)</th>
                      <th className="py-2 px-2.5">Risk Pattern</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium text-[11px]">
                    {[
                      { id: 'DUL-201', dist: '3.2 km', form: 'Barail', depth: '3,100 – 3,500', events: 'Mud Loss (3), High Torque (3)', npt: '11.2', pattern: 'Mud Loss, High Torque' },
                      { id: 'DUL-205', dist: '3.4 km', form: 'Barail', depth: '3,150 – 3,450', events: 'Mud Loss (2), High Torque (2)', npt: '7.4', pattern: 'Mud Loss, High Torque' },
                      { id: 'DUL-198', dist: '4.8 km', form: 'Tipam/Barail', depth: '3,200 – 3,600', events: 'Casing Issue (1), Mud Loss (1)', npt: '5.1', pattern: 'Mud Loss, Casing' }
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/wells/${row.id}`)}>
                        <td className="py-2.5 px-2.5 font-bold text-[#0070F3]">{row.id}</td>
                        <td className="py-2.5 px-2.5 font-mono text-slate-500">{row.dist}</td>
                        <td className="py-2.5 px-2.5 font-semibold text-slate-700">{row.form}</td>
                        <td className="py-2.5 px-2.5 font-mono text-slate-600">{row.depth}</td>
                        <td className="py-2.5 px-2.5 text-slate-600">{row.events}</td>
                        <td className="py-2.5 px-2.5 font-mono font-bold text-slate-800">{row.npt}</td>
                        <td className="py-2.5 px-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-700">
                            {row.pattern}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Recent Current-Well Signals (DUL-235) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527]">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>Recent Current-Well Signals (DUL-235)</span>
                </div>
                <button className="text-[10px] font-bold text-[#0070F3] hover:underline flex items-center">
                  <span>View All</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[10px]">
                      <th className="py-2 px-2.5">Depth (m)</th>
                      <th className="py-2 px-2.5">Parameter / Event</th>
                      <th className="py-2 px-2.5">Severity</th>
                      <th className="py-2 px-2.5">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium text-[11px]">
                    {[
                      { depth: '3,820', event: 'Increase in Torque', sev: 'High', date: '29 Sept 2026, 09:20' },
                      { depth: '3,780', event: 'Flow Rate Fluctuation', sev: 'Medium', date: '29 Sept 2026, 06:15' },
                      { depth: '3,650', event: 'Slight Loss Circulation', sev: 'Medium', date: '28 Sept 2026, 14:40' },
                      { depth: '3,420', event: 'ROP Decrease', sev: 'Low', date: '27 Sept 2026, 11:10' },
                      { depth: '3,210', event: 'Elevated Standpipe Pressure', sev: 'Medium', date: '25 Sept 2026, 16:25' }
                    ].map((sig, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2.5 px-2.5 font-mono font-bold text-[#0B1527]">{sig.depth}</td>
                        <td className="py-2.5 px-2.5 font-semibold text-slate-800">{sig.event}</td>
                        <td className="py-2.5 px-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            sig.sev === 'High' ? 'bg-red-100 text-red-700' :
                            sig.sev === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {sig.sev}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 font-mono text-slate-500 text-[10px]">{sig.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bottom Section: Mitigation History from Offset Wells (3 Cards) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527] pb-2 border-b border-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Mitigation History from Offset Wells</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Mud Loss */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527]">
                      <Flame className="w-4 h-4 text-[#E11D48]" />
                      <span>Mud Loss Events</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-700">
                      High Relevance
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    <strong>Observed in:</strong> DUL-201, DUL-205, DUL-198 (3,200 – 3,400 m)
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    <strong>Mitigation History:</strong> Lost circulation materials used, pill strategy documented in well reports.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/ai/evidence')}
                  className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-lg hover:bg-slate-100 transition shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5 text-[#0070F3]" />
                  <span>View Evidence</span>
                </button>
              </div>

              {/* Card 2: High Torque */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527]">
                      <Activity className="w-4 h-4 text-amber-500" />
                      <span>High Torque Events</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700">
                      High Relevance
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    <strong>Observed in:</strong> DUL-201, DUL-205 (3,400 – 3,700 m)
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    <strong>Mitigation History:</strong> Torque reduction with optimized drilling parameters documented in offset reports.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/ai/evidence')}
                  className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-lg hover:bg-slate-100 transition shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5 text-[#0070F3]" />
                  <span>View Evidence</span>
                </button>
              </div>

              {/* Card 3: NPT Events */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527]">
                      <Clock className="w-4 h-4 text-[#0070F3]" />
                      <span>NPT Events</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-[#0070F3]">
                      Medium Relevance
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    <strong>Observed in:</strong> DUL-201, DUL-205 (Barail formation)
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    <strong>Mitigation History:</strong> NPT due to mud loss and torque issues. Managed with corrective actions as per well reports.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/ai/evidence')}
                  className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-lg hover:bg-slate-100 transition shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5 text-[#0070F3]" />
                  <span>View Evidence</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
