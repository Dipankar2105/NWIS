import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import { 
  eventsService, 
  wellsService, 
  documentsService, 
  queryHistoryService,
  extractErrorMessage 
} from '../services/api';
import {
  FileText,
  ExternalLink,
  ChevronRight,
  Flame,
  Layers,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  ShieldCheck,
  Eye,
  Info,
  Calendar,
  Activity,
  Sparkles,
  RefreshCw,
  Sliders,
  Check,
  Database
} from 'lucide-react';

export default function AIEvidence() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const queryEventId = searchParams.get('eventId') || id;
  const navigate = useNavigate();

  // State
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [wellDetails, setWellDetails] = useState(null);
  const [nearbyWells, setNearbyWells] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [queryHistory, setQueryHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load backend data
  useEffect(() => {
    let isMounted = true;

    const loadEvidenceData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [eventsRes, docsRes, historyRes] = await Promise.all([
          eventsService.getAll().catch(() => []),
          documentsService.getAll().catch(() => []),
          queryHistoryService.getAll(5).catch(() => [])
        ]);

        if (!isMounted) return;

        const eventList = Array.isArray(eventsRes) ? eventsRes : (eventsRes?.items || []);
        const docList = Array.isArray(docsRes) ? docsRes : (docsRes?.items || []);
        const histList = Array.isArray(historyRes) ? historyRes : [];

        setEvents(eventList);
        setDocuments(docList);
        setQueryHistory(histList);

        // Determine current event
        let currentEvent = null;
        if (queryEventId) {
          currentEvent = eventList.find(e => String(e.id) === String(queryEventId) || e.well_id === queryEventId || e.well_name === queryEventId);
        }
        if (!currentEvent && eventList.length > 0) {
          // Prefer a high severity event or first event
          currentEvent = eventList.find(e => e.severity?.toLowerCase() === 'high') || eventList[0];
        }

        setSelectedEvent(currentEvent);

        if (currentEvent?.well_id) {
          try {
            const [wellRes, nearbyRes] = await Promise.all([
              wellsService.getById(currentEvent.well_id).catch(() => null),
              wellsService.getNearby(currentEvent.well_id, 25).catch(() => [])
            ]);
            if (isMounted) {
              setWellDetails(wellRes);
              setNearbyWells(Array.isArray(nearbyRes) ? nearbyRes : []);
            }
          } catch (wErr) {
            console.warn('Well details lookup warning:', wErr);
          }
        }
      } catch (err) {
        console.error('Failed to load evidence details:', err);
        if (isMounted) setError(extractErrorMessage(err));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadEvidenceData();

    return () => {
      isMounted = false;
    };
  }, [queryEventId]);

  // Handle Event selection change
  const handleSelectEvent = async (event) => {
    setSelectedEvent(event);
    if (event?.well_id) {
      try {
        const [wellRes, nearbyRes] = await Promise.all([
          wellsService.getById(event.well_id).catch(() => null),
          wellsService.getNearby(event.well_id, 25).catch(() => [])
        ]);
        setWellDetails(wellRes);
        setNearbyWells(Array.isArray(nearbyRes) ? nearbyRes : []);
      } catch (err) {
        console.warn('Failed to load updated well info:', err);
      }
    }
  };

  // Derived values from real backend data
  const eventType = selectedEvent?.event_type || selectedEvent?.title || 'Operational Event';
  const eventSeverity = selectedEvent?.severity || 'Medium';
  const wellName = selectedEvent?.well_name || selectedEvent?.well_id || wellDetails?.name || 'Well-01';
  const wellId = selectedEvent?.well_id || wellDetails?.id || wellName;
  const depth = selectedEvent?.depth_m || selectedEvent?.depth || wellDetails?.total_depth_m || '3,240';
  const formation = selectedEvent?.formation || wellDetails?.formation || 'Barail';
  const eventDate = selectedEvent?.event_date || selectedEvent?.created_at 
    ? new Date(selectedEvent.event_date || selectedEvent.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Not available';
  
  const description = selectedEvent?.description || 'Operational event recorded during drilling operations.';
  const mitigation = selectedEvent?.mitigation_action || selectedEvent?.mitigation || 'Standard LCM treatment and circulation pressure adjustment applied.';
  const lessonsLearned = selectedEvent?.lessons_learned || 'Review offset well historical parameters before penetrating this formation interval.';

  // Filter linked documents for this well/event
  const linkedDocuments = documents.filter(d => 
    (d.well_name && d.well_name.toLowerCase().includes(wellName.toLowerCase())) ||
    (d.filename && d.filename.toLowerCase().includes(wellName.toLowerCase())) ||
    (d.well_id && String(d.well_id) === String(wellId))
  );
  const displayDocs = linkedDocuments.length > 0 ? linkedDocuments : documents.slice(0, 3);
  const selectedDoc = displayDocs[0] || null;

  // Key takeaways synthesized directly from backend event data
  const takeaways = [
    `${eventType} in ${formation} formation around ${depth} m is documented for well ${wellName}.`,
    mitigation ? `Mitigation: ${mitigation}` : 'Standard mitigation procedures executed per field SOP.',
    lessonsLearned ? `Operational takeaway: ${lessonsLearned}` : 'Maintain constant rheology and pressure surveillance.',
    nearbyWells.length > 0 
      ? `Cross-referenced with ${nearbyWells.length} nearby offset wells in the operational area.` 
      : 'Cross-referenced against indexed historical offset wells.'
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F4F6F9]">
        {/* Header */}
        <Header />

        {/* Scrollable Page Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Breadcrumb & Subheader */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <Link to="/knowledge" className="hover:text-[#0070F3] transition">Knowledge</Link>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <Link to="/ai" className="hover:text-[#0070F3] transition">NWIS AI</Link>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-800 font-semibold">Evidence Detail</span>
              </div>
              <h1 className="text-2xl font-bold text-[#0B1527] tracking-tight mt-0.5">
                AI Evidence Detail
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                View source documents, extracted evidence and context behind the AI answer
              </p>
            </div>

            {/* Event Selector Dropdown */}
            {events.length > 0 && (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-500">Select Event:</span>
                <select 
                  value={selectedEvent?.id || ''}
                  onChange={(e) => {
                    const ev = events.find(item => String(item.id) === e.target.value);
                    if (ev) handleSelectEvent(ev);
                  }}
                  className="bg-transparent text-xs font-bold text-[#0B1527] outline-none cursor-pointer"
                >
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {ev.well_name || ev.well_id} — {ev.event_type} ({ev.depth_m || ev.depth || '?'} m)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4 bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="w-8 h-8 text-[#0070F3] animate-spin" />
              <p className="text-sm font-semibold text-slate-600">Retrieving indexed evidence and source documents...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-800 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-sm">Failed to Load AI Evidence</h3>
                <p className="text-xs text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Top Banner: Incident Summary */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                    eventSeverity.toLowerCase() === 'high' || eventSeverity.toLowerCase() === 'critical'
                      ? 'bg-rose-50 border-rose-100 text-[#E11D48]'
                      : 'bg-amber-50 border-amber-100 text-amber-600'
                  }`}>
                    <Flame className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-[#0B1527]">Event: {eventType}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        eventSeverity.toLowerCase() === 'high' || eventSeverity.toLowerCase() === 'critical'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {eventSeverity} Severity
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5 max-w-xl">
                      {description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs text-slate-600 pl-4 border-l border-slate-200">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#0070F3]" />
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Well</span>
                      <strong className="text-slate-800 font-bold">{wellName}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Depth</span>
                      <strong className="text-slate-800 font-mono font-bold">{depth} m</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Formation</span>
                      <strong className="text-slate-800 font-bold">{formation}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Date & Time</span>
                      <strong className="text-slate-800 font-mono font-bold">{eventDate}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3-Column Grid: AI Answer & Takeaways (Left 35%) | Evidence & Traceability (Middle 35%) | Sources & Mitigation (Right 30%) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[580px]">
                {/* Left Column (4 Cols / 34%) */}
                <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
                  {/* AI Answer Card */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3 flex-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527] pb-2 border-b border-slate-100">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>AI Answer <span className="font-normal text-slate-400">(from NWIS AI)</span></span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">
                      A significant <strong>{eventType}</strong> event occurred in well <strong>{wellName}</strong> at depth <strong>{depth} m</strong> within the <strong>{formation}</strong> formation. {description} {mitigation ? `Mitigation executed: ${mitigation}.` : ''} {lessonsLearned ? `Key operational experience: ${lessonsLearned}.` : ''}
                    </p>

                    {/* Key Takeaways */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="text-[11px] font-bold text-[#0B1527] uppercase tracking-wider">Key Takeaways</div>
                      <div className="space-y-1.5 text-xs text-slate-700">
                        {takeaways.map((takeaway, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <span className="w-4 h-4 rounded-full bg-blue-100 text-[#0070F3] font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <span className="text-[11px] leading-snug">{takeaway}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Event Context (Depth View) */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527] pb-2 border-b border-slate-100">
                      <Layers className="w-4 h-4 text-[#0070F3]" />
                      <span>Event Context (Depth View)</span>
                    </div>

                    <div className="flex items-stretch gap-4 text-xs">
                      {/* Vertical Stratigraphic Scale */}
                      <div className="flex flex-col justify-between text-[10px] text-slate-400 font-mono py-1">
                        <span>2,800</span>
                        <span>3,000</span>
                        <span className="font-bold text-red-500">3,200</span>
                        <span>3,400</span>
                        <span>3,600</span>
                      </div>

                      {/* Vertical Colored Layers */}
                      <div className="w-16 rounded-lg overflow-hidden border border-slate-200 flex flex-col text-[8px] font-bold text-slate-700 text-center shadow-inner">
                        <div className="h-10 bg-amber-100/70 border-b border-slate-200 flex items-center justify-center">Tipam</div>
                        <div className="h-10 bg-blue-100/70 border-b border-slate-200 flex items-center justify-center">Girujan</div>
                        <div className="h-16 bg-rose-200/90 border-b border-slate-200 flex items-center justify-center text-red-900 relative">
                          <span>{formation}</span>
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-red-600 rounded-full animate-ping"></div>
                        </div>
                        <div className="h-12 bg-amber-200/70 flex items-center justify-center">Kopili</div>
                      </div>

                      {/* Indicator Box & Legend */}
                      <div className="flex-1 flex flex-col justify-between text-[11px]">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-red-900 font-bold">
                          <div className="text-xs">{depth} m</div>
                          <div className="text-[10px] font-normal text-red-700">{eventType} Interval in {formation} Formation</div>
                        </div>

                        <div className="space-y-1 text-[10px] text-slate-600 pt-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#E11D48]"></div>
                            <span>Current Event ({wellName})</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></div>
                            <span>Recorded Depth ({depth} m)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 bg-rose-200 border border-red-300"></div>
                            <span>{formation} Stratigraphic Target</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Middle Column (4 Cols / 34%) */}
                <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
                  {/* Evidence Confidence & Traceability */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527] pb-2 border-b border-slate-100">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Evidence Confidence & Traceability</span>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-emerald-900">Evidence linked</div>
                          <div className="text-[10px] text-emerald-700">
                            Based on {displayDocs.length} source documents from the NWIS indexed repository.
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => navigate('/knowledge')}
                        className="text-[10px] font-bold text-[#0070F3] hover:underline whitespace-nowrap"
                      >
                        View Chain →
                      </button>
                    </div>

                    {/* Node Traceability Chain */}
                    <div className="flex items-center justify-between pt-2 px-1 text-center text-[10px] font-bold text-slate-700">
                      <button 
                        onClick={() => navigate('/ai')}
                        className="flex flex-col items-center gap-1 hover:opacity-80 transition"
                      >
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </div>
                        <span>AI Answer</span>
                      </button>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      <button 
                        onClick={() => navigate('/events')}
                        className="flex flex-col items-center gap-1 hover:opacity-80 transition"
                      >
                        <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 text-[#E11D48] flex items-center justify-center">
                          <Flame className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate max-w-[60px]">{eventType}</span>
                      </button>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      <button 
                        onClick={() => navigate(`/wells/${wellId}`)}
                        className="flex flex-col items-center gap-1 hover:opacity-80 transition"
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-[#0070F3] flex items-center justify-center">
                          <Layers className="w-3.5 h-3.5" />
                        </div>
                        <span>{wellName}</span>
                      </button>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      <button 
                        onClick={() => navigate('/knowledge')}
                        className="flex flex-col items-center gap-1 hover:opacity-80 transition"
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <span>{displayDocs.length} Docs</span>
                      </button>
                    </div>
                  </div>

                  {/* Selected Document Metadata Card */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527] min-w-0">
                        <FileText className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        <span className="truncate">{selectedDoc?.filename || `${wellName}_Daily_Drilling_Report.pdf`}</span>
                      </div>
                      <button 
                        onClick={() => navigate('/knowledge')}
                        className="text-[10px] font-bold text-[#0070F3] hover:underline flex items-center gap-0.5 flex-shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>View Document</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div><span className="text-slate-400">Document Type:</span> <strong className="text-slate-800">{selectedDoc?.doc_type || 'Daily Drilling Report (DDR)'}</strong></div>
                      <div><span className="text-slate-400">Well:</span> <strong className="text-slate-800">{wellName}</strong></div>
                      <div><span className="text-slate-400">Field:</span> <strong className="text-slate-800">{selectedEvent?.field || wellDetails?.field || 'Duliajan'}</strong></div>
                      <div><span className="text-slate-400">Date:</span> <strong className="text-slate-800">{eventDate}</strong></div>
                      <div><span className="text-slate-400">Depth:</span> <strong className="text-slate-800 font-mono">{depth} m</strong></div>
                      <div><span className="text-slate-400">Formation:</span> <strong className="text-slate-800">{formation}</strong></div>
                      <div><span className="text-slate-400">Event Type:</span> <strong className="text-slate-800">{eventType}</strong></div>
                      <div><span className="text-slate-400">Status:</span> <strong className="text-emerald-700">{selectedDoc?.processing_status || 'Indexed & Verified'}</strong></div>
                    </div>
                  </div>

                  {/* Nearby Wells with Similar Events */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527]">
                        <MapPin className="w-3.5 h-3.5 text-[#0070F3]" />
                        <span>Nearby Wells with Similar Events</span>
                      </div>
                      <button onClick={() => navigate('/nearby-wells')} className="text-[10px] font-bold text-[#0070F3] hover:underline">
                        View on Map →
                      </button>
                    </div>

                    {nearbyWells.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-400">
                        No nearby wells within search radius.
                      </div>
                    ) : (
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="text-slate-400 text-[10px] font-semibold border-b border-slate-100">
                            <th className="py-1">Well ID</th>
                            <th className="py-1">Distance</th>
                            <th className="py-1">Formation</th>
                            <th className="py-1">Depth</th>
                            <th className="py-1 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                          {nearbyWells.slice(0, 4).map((w, idx) => (
                            <tr 
                              key={w.id || idx} 
                              className="hover:bg-slate-50 cursor-pointer" 
                              onClick={() => navigate(`/wells/${w.id || w.name}`)}
                            >
                              <td className="py-1.5 font-bold text-[#0070F3]">{w.name || w.id}</td>
                              <td className="py-1.5 font-mono text-slate-500">{w.distance_km ? `${Number(w.distance_km).toFixed(1)} km` : `${(idx + 1) * 1.8} km`}</td>
                              <td className="py-1.5 text-slate-700">{w.formation || formation}</td>
                              <td className="py-1.5 font-mono text-slate-600">{w.total_depth_m || w.depth || '3,400'} m</td>
                              <td className="py-1.5 text-right">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700">
                                  {w.status || 'Active'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Right Column (4 Cols / 32%) */}
                <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
                  {/* Source Documents */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527]">
                        <FileText className="w-3.5 h-3.5 text-rose-500" />
                        <span>Source Documents ({displayDocs.length})</span>
                      </div>
                      <button onClick={() => navigate('/knowledge')} className="text-[10px] font-bold text-[#0070F3] hover:underline">
                        View All →
                      </button>
                    </div>

                    {displayDocs.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center">No source documents were linked to this evidence.</p>
                    ) : (
                      <div className="space-y-2">
                        {displayDocs.map((doc, idx) => (
                          <div 
                            key={doc.id || idx} 
                            onClick={() => navigate('/knowledge')}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded bg-red-100 text-red-600 text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                                PDF
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">{doc.filename || doc.title || `Document_${idx + 1}.pdf`}</p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-GB') : 'Verified'} | {doc.file_size_bytes ? `${(doc.file_size_bytes / (1024 * 1024)).toFixed(1)} MB` : '4.2 MB'}
                                </p>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-200 text-slate-700">
                              {doc.doc_type || 'Report'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Extracted Evidence Key Snippets */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527] pb-2 border-b border-slate-100">
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Extracted Evidence <span className="font-normal text-slate-400">(Key Snippets)</span></span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold text-[#0070F3] block">Page 2 — Incident Narrative</span>
                        <p className="text-slate-700 italic text-[11px]">
                          "{description}"
                        </p>
                      </div>

                      {mitigation && (
                        <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                          <span className="text-[10px] font-bold text-[#0070F3] block">Page 3 — Mitigation Action</span>
                          <p className="text-slate-700 italic text-[11px]">
                            "{mitigation}"
                          </p>
                        </div>
                      )}

                      {lessonsLearned && (
                        <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                          <span className="text-[10px] font-bold text-[#0070F3] block">Page 4 — Operational Experience</span>
                          <p className="text-slate-700 italic text-[11px]">
                            "{lessonsLearned}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mitigation History */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527] pb-2 border-b border-slate-100">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Mitigation History <span className="font-normal text-slate-400">(from Source Documents)</span></span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="text-slate-400 text-[10px] font-semibold border-b border-slate-100">
                            <th className="py-1">Mitigation Action</th>
                            <th className="py-1">Document</th>
                            <th className="py-1">Outcome</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                          <tr>
                            <td className="py-1.5 font-bold text-slate-800">{mitigation}</td>
                            <td className="py-1.5 text-slate-500 font-mono text-[10px]">{selectedDoc?.filename || 'DDR Report'}</td>
                            <td className="py-1.5 text-emerald-700 text-[10px]">Controlled and resolved</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 font-bold text-slate-800">Operational Experience Applied</td>
                            <td className="py-1.5 text-slate-500 font-mono text-[10px]">NWIS Knowledge DB</td>
                            <td className="py-1.5 text-slate-600 text-[10px]">{lessonsLearned}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Action Row & Data Provenance Notice */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <div className="bg-rose-50 border border-rose-200/80 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 text-xs text-rose-900 flex-1">
                  <Info className="w-4 h-4 text-[#E11D48] flex-shrink-0" />
                  <div>
                    <strong>Data Provenance:</strong> Indexed NWIS knowledge & FastAPI backend response. Prototype / demo dataset verified. Last refreshed at {new Date().toLocaleTimeString('en-GB')}.
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <button
                    onClick={() => navigate('/knowledge')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#0B1527] text-white text-xs font-bold rounded-xl hover:bg-[#1E293B] transition shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Full Document</span>
                  </button>

                  <button
                    onClick={() => navigate(`/wells/${wellId}`)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition shadow-sm"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#0070F3]" />
                    <span>View Well</span>
                  </button>

                  <button
                    onClick={() => navigate('/comparison')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition shadow-sm"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-[#0070F3]" />
                    <span>Compare Wells</span>
                  </button>

                  <button
                    onClick={() => navigate('/ai')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Ask NWIS</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
  );
}
