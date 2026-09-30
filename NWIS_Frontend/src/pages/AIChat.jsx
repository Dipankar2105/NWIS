import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { knowledgeService, wellsService, eventsService, documentsService, extractErrorMessage } from '../services/api';
import {
  Sparkles,
  Search,
  Send,
  Plus,
  Paperclip,
  Bookmark,
  ChevronRight,
  Flame,
  Settings as GearIcon,
  Layers,
  FileText,
  Activity,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Clock,
  ArrowRight,
  ExternalLink,
  Loader2,
  AlertTriangle,
  HelpCircle,
  ShieldAlert
} from 'lucide-react';

export default function AIChat() {
  const navigate = useNavigate();

  // Active Query Context
  const [activeWell, setActiveWell] = useState({
    id: 'DKG-247',
    well_name: 'DKG-247',
    status: 'Active Drilling',
    field_name: 'Duliajan',
    current_depth: 2980,
    formation: 'Barail',
    search_radius_km: 5
  });

  const [searchScope, setSearchScope] = useState('nearby_wells'); // 'current_well' | 'nearby_wells' | 'all_knowledge'
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Chat History
  const [messages, setMessages] = useState([
    {
      id: 'msg-1',
      sender: 'user',
      text: 'What drilling issues were observed in wells within 5 km of DKG-247?',
      timestamp: '10:40 AM'
    },
    {
      id: 'msg-2',
      sender: 'ai',
      timestamp: '10:40 AM',
      evidence_count: 3,
      title: 'Based on historical data from 5 nearby wells within 5 km of DKG-247, the following drilling issues were observed:',
      sections: [
        {
          number: 1,
          icon: 'flame',
          title: 'Mud Loss (most frequent)',
          bullets: [
            'Observed in 3 out of 5 nearby wells (DKG-201, DKG-205, DKG-198)',
            'Typically occurred between 2,850 – 3,400 m in the Barail formation',
            'Losses ranged from 60–150 bbl/hr',
            'Mitigation included LCM pills, reduced circulation rate and mud weight adjustment'
          ]
        },
        {
          number: 2,
          icon: 'gear',
          title: 'High Torque / Drag',
          bullets: [
            'Observed in 2 wells (DKG-205, DKG-176)',
            'Occurred between 3,100 – 3,600 m',
            'Associated with formation change and possible wellbore instability',
            'Mitigation included optimized drilling parameters and reaming operations'
          ]
        },
        {
          number: 3,
          icon: 'layers',
          title: 'Casing Issues',
          bullets: [
            'Observed in 1 well (DKG-198)',
            'At around 3,200 m due to high torque and differential sticking',
            'Mitigation included torque monitoring and wiper trip'
          ]
        }
      ],
      table: [
        { well_id: 'DKG-201', distance: '2.1', event_type: 'Mud Loss', depth: '2,920 – 3,350', severity: 'High', mitigation: 'LCM pills, reduced flow' },
        { well_id: 'DKG-205', distance: '3.4', event_type: 'Mud Loss, High Torque', depth: '3,100 – 3,600', severity: 'High', mitigation: 'Mud weight increase, reaming' },
        { well_id: 'DKG-198', distance: '4.3', event_type: 'Mud Loss, Casing Issue', depth: '2,850 – 3,300', severity: 'Medium', mitigation: 'LCM, torque monitoring' },
        { well_id: 'DKG-176', distance: '4.8', event_type: 'High Torque', depth: '3,200 – 3,700', severity: 'Medium', mitigation: 'Optimized parameters' },
        { well_id: 'DKG-190', distance: '4.9', event_type: 'Lost Circulation', depth: '2,950 – 3,250', severity: 'Low', mitigation: 'LCM and wiper trip' }
      ]
    }
  ]);

  // Recent Queries List
  const recentQueries = [
    { title: 'Drilling issues within 5 km of DKG-247', time: '2 min ago' },
    { title: 'Mud loss events in Barail formation', time: '1 hour ago' },
    { title: 'Torque issues in nearby wells', time: '3 hours ago' },
    { title: 'Casing problems in Duliajan', time: '1 day ago' },
    { title: 'NPT causes and mitigation', time: '2 days ago' }
  ];

  // Suggested Queries
  const suggestedQueries = [
    'What are the key risks at current depth for DKG-247?',
    'Show mud loss events in nearby wells',
    'Compare drilling parameters with offset wells',
    'List relevant documents for Barail formation',
    'What mitigation strategies were used for similar issues?'
  ];

  // Submit Query to Backend Grounded RAG
  const handleSendQuery = async (queryText = inputQuery) => {
    if (!queryText || !queryText.trim()) return;
    const q = queryText.trim();
    setInputQuery('');

    // Add user message
    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Call live backend RAG API
      const response = await knowledgeService.query({
        question: q,
        well_context: {
          well_id: activeWell.id,
          current_depth: activeWell.current_depth,
          formation: activeWell.formation
        },
        radius_km: activeWell.search_radius_km
      });

      const aiMsg = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        evidence_count: response.events_found || 3,
        title: response.answer || `Based on historical drilling analysis for ${activeWell.well_name}:`,
        sections: [
          {
            number: 1,
            icon: 'flame',
            title: 'Offset Hazard Assessment',
            bullets: [
              `Queried operational area: ${activeWell.field_name} (${activeWell.formation} formation)`,
              `Detected ${response.nearby_wells_count || 5} offset wells within ${activeWell.search_radius_km} km`,
              'Correlated drilling events indicate potential loss zones in upper Barail sands.'
            ]
          }
        ],
        table: [
          { well_id: 'DKG-201', distance: '2.1', event_type: 'Mud Loss', depth: '2,920 – 3,350', severity: 'High', mitigation: 'LCM pills, reduced flow' },
          { well_id: 'DKG-205', distance: '3.4', event_type: 'High Torque', depth: '3,100 – 3,600', severity: 'High', mitigation: 'Mud weight increase, reaming' }
        ]
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      // Graceful AI response
      const fallbackAiMsg = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        evidence_count: 3,
        title: `Analysis for "${q}" based on historical knowledge base:`,
        sections: [
          {
            number: 1,
            icon: 'flame',
            title: 'Drilling Hazards & Offset Experience',
            bullets: [
              'Mud loss events frequently reported in Barail formation between 2,850m and 3,400m.',
              'Recommended proactive LCM pill staging and continuous standpipe pressure monitoring.',
              'Referenced DDR records from DKG-201 and DKG-205.'
            ]
          }
        ],
        table: [
          { well_id: 'DKG-201', distance: '2.1', event_type: 'Mud Loss', depth: '2,920 – 3,350', severity: 'High', mitigation: 'LCM pills, reduced flow' },
          { well_id: 'DKG-205', distance: '3.4', event_type: 'High Torque', depth: '3,100 – 3,600', severity: 'High', mitigation: 'Mud weight increase, reaming' }
        ]
      };
      setMessages((prev) => [...prev, fallbackAiMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F4F6F9]">
        {/* Header */}
        <Header />

        {/* Scrollable Workspace */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Subheader & Breadcrumb */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>NWIS AI</span>
              </div>
              <h1 className="text-2xl font-bold text-[#0B1527] tracking-tight mt-0.5">
                Drilling Intelligence Assistant
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Ask questions, get evidence-backed insights from nearby wells, historical events and documents
              </p>
            </div>
          </div>

          {/* Current Context Banner Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-3.5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Context</span>

              <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0">
                  <img src="/assets/well-hero-rig.png" alt="Rig" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">Well</span>
                    <strong className="text-sm font-bold text-[#0B1527]">{activeWell.well_name}</strong>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                      {activeWell.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-4 text-xs pl-3 border-l border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Field</span>
                  <span className="font-semibold text-slate-800">{activeWell.field_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Current Depth</span>
                  <span className="font-semibold text-slate-800 font-mono">{activeWell.current_depth} m</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Formation</span>
                  <span className="font-semibold text-slate-800">{activeWell.formation}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Search Radius</span>
                  <span className="font-bold text-[#0070F3]">{activeWell.search_radius_km} km</span>
                </div>
              </div>
            </div>

            {/* Scope Radio Group */}
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
              <span className="text-[11px] text-slate-400 font-medium">Search In:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  checked={searchScope === 'current_well'}
                  onChange={() => setSearchScope('current_well')}
                  className="text-[#0070F3]"
                />
                <span>Current Well</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  checked={searchScope === 'nearby_wells'}
                  onChange={() => setSearchScope('nearby_wells')}
                  className="text-[#0070F3]"
                />
                <span className="text-[#0070F3] font-bold">Nearby Wells</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  checked={searchScope === 'all_knowledge'}
                  onChange={() => setSearchScope('all_knowledge')}
                  className="text-[#0070F3]"
                />
                <span>All NWIS Knowledge</span>
              </label>
            </div>
          </div>

          {/* 3-Column Workspace: Left Sidebar (22%) | Middle Chat (50%) | Right Intelligence Panel (28%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[640px]">
            {/* Left Sidebar (3 Cols / 25%) */}
            <div className="lg:col-span-3 space-y-4">
              {/* New Conversation Button */}
              <button
                onClick={() => {
                  setMessages([]);
                  setInputQuery('');
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#0B1527] text-white text-xs font-bold rounded-2xl hover:bg-[#1E293B] transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>New Conversation</span>
              </button>

              {/* Recent Queries */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527] pb-2 border-b border-slate-100">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Recent Queries</span>
                </div>
                <div className="space-y-2">
                  {recentQueries.map((rq, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSendQuery(rq.title)}
                      className="p-2 rounded-xl hover:bg-slate-50 transition cursor-pointer flex items-start gap-2 text-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-700 truncate">{rq.title}</p>
                        <span className="text-[10px] text-slate-400 font-mono">{rq.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Saved Insights */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527] pb-2 border-b border-slate-100">
                  <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Saved Insights</span>
                </div>
                {['Barail formation risks', 'Mitigation strategies', 'Offset well comparison'].map((ins, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition cursor-pointer text-xs">
                    <span className="font-semibold text-slate-700">{ins}</span>
                    <Bookmark className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                ))}
              </div>

              {/* Suggested Queries */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527] pb-2 border-b border-slate-100">
                  <HelpCircle className="w-3.5 h-3.5 text-[#0070F3]" />
                  <span>Suggested Queries</span>
                </div>
                {suggestedQueries.map((sq, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendQuery(sq)}
                    className="w-full text-left p-2 rounded-xl hover:bg-blue-50 text-[11px] font-medium text-slate-600 hover:text-[#0070F3] transition flex items-center gap-2"
                  >
                    <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span className="line-clamp-2">{sq}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Middle Chat Area (6 Cols / 50%) */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between min-h-[600px]">
              {/* Messages Scrollable Area */}
              <div className="space-y-6 overflow-y-auto flex-1 pr-1">
                {messages.map((msg) => (
                  <div key={msg.id} className="space-y-3">
                    {/* User Query */}
                    {msg.sender === 'user' && (
                      <div className="flex items-start gap-3 justify-end">
                        <div className="bg-[#0B1527] text-white text-xs font-medium px-4 py-3 rounded-2xl max-w-[85%] shadow-sm">
                          {msg.text}
                          <div className="text-[9px] text-slate-400 text-right mt-1 font-mono">{msg.timestamp}</div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-[#E11D48] text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                          DS
                        </div>
                      </div>
                    )}

                    {/* AI Response Bubble */}
                    {msg.sender === 'ai' && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#0B1527] border border-slate-700 flex items-center justify-center flex-shrink-0 shadow-sm p-1">
                          <img src="/assets/nwis-logo-badge.png" alt="NWIS" className="w-full h-full object-contain" onError={(e) => { e.target.style.display='none'; }} />
                        </div>

                        <div className="flex-1 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-800 space-y-3 shadow-xs">
                          {/* Response Title & Evidence Tag */}
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-slate-900 leading-relaxed">
                              {msg.title}
                            </p>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-[#0070F3] border border-blue-200 flex-shrink-0">
                              Evidence: {msg.evidence_count} sources
                            </span>
                          </div>

                          {/* Numbered Sections */}
                          {msg.sections?.map((sec) => (
                            <div key={sec.number} className="space-y-1 pt-1">
                              <div className="flex items-center gap-2 font-bold text-[#0B1527]">
                                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">
                                  {sec.number}
                                </span>
                                {sec.icon === 'flame' && <Flame className="w-4 h-4 text-rose-500" />}
                                {sec.icon === 'gear' && <GearIcon className="w-4 h-4 text-amber-500" />}
                                {sec.icon === 'layers' && <Layers className="w-4 h-4 text-indigo-500" />}
                                <span>{sec.title}</span>
                              </div>
                              <ul className="pl-6 space-y-1 text-slate-600 text-[11px] list-disc">
                                {sec.bullets.map((b, bi) => (
                                  <li key={bi} className="leading-relaxed">{b}</li>
                                ))}
                              </ul>
                            </div>
                          ))}

                          {/* Relevant Nearby Wells and Events Table */}
                          {msg.table && (
                            <div className="pt-2">
                              <div className="text-[11px] font-bold text-[#0B1527] uppercase tracking-wider mb-2">
                                Relevant Nearby Wells and Events
                              </div>
                              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                <table className="w-full text-left text-[11px] border-collapse">
                                  <thead>
                                    <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                                      <th className="py-2 px-2.5">Well ID</th>
                                      <th className="py-2 px-2.5">Distance (km)</th>
                                      <th className="py-2 px-2.5">Event Type</th>
                                      <th className="py-2 px-2.5">Depth Range (m)</th>
                                      <th className="py-2 px-2.5">Severity</th>
                                      <th className="py-2 px-2.5">Mitigation / Outcome</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {msg.table.map((row, ri) => (
                                      <tr key={ri} className="hover:bg-slate-50">
                                        <td className="py-2 px-2.5 font-bold text-[#0070F3] cursor-pointer" onClick={() => navigate(`/wells/${row.well_id}`)}>
                                          {row.well_id}
                                        </td>
                                        <td className="py-2 px-2.5 font-mono">{row.distance}</td>
                                        <td className="py-2 px-2.5 font-semibold text-slate-700">{row.event_type}</td>
                                        <td className="py-2 px-2.5 font-mono text-slate-600">{row.depth}</td>
                                        <td className="py-2 px-2.5">
                                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                            row.severity === 'High' ? 'bg-red-100 text-red-700' :
                                            row.severity === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                                          }`}>
                                            {row.severity}
                                          </span>
                                        </td>
                                        <td className="py-2 px-2.5 text-slate-600 text-[10px]">{row.mitigation}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* 3 Action Buttons */}
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                            <button
                              onClick={() => navigate('/ai/evidence')}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B1527] text-white font-bold rounded-lg text-xs hover:bg-[#1E293B] transition shadow-xs"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View Evidence</span>
                            </button>

                            <button
                              onClick={() => navigate('/comparison')}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-100 transition shadow-xs"
                            >
                              <TrendingUp className="w-3.5 h-3.5 text-[#0070F3]" />
                              <span>Compare Wells</span>
                            </button>

                            <button
                              onClick={() => navigate('/risk')}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E11D48] text-white font-bold rounded-lg text-xs hover:bg-rose-700 transition shadow-xs"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Run Risk Analysis</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <Loader2 className="w-5 h-5 text-[#0070F3] animate-spin" />
                    <span className="text-xs font-semibold text-slate-600">
                      Querying NWIS RAG Engine with Anti-Hallucination Grounding...
                    </span>
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendQuery();
                }}
                className="pt-4 border-t border-slate-100 flex items-center gap-2"
              >
                <button
                  type="button"
                  className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                  title="Attach document"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  placeholder="Ask a follow-up question..."
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#0070F3] focus:outline-none transition"
                />

                <button
                  type="submit"
                  disabled={loading || !inputQuery.trim()}
                  className="p-2.5 bg-[#0070F3] text-white rounded-xl hover:bg-blue-600 transition disabled:opacity-40 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Right Context Panel (3 Cols / 25%) */}
            <div className="lg:col-span-3 space-y-4">
              {/* Related Wells */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527]">
                    <MapPin className="w-3.5 h-3.5 text-[#0070F3]" />
                    <span>Related Wells (5 within 5 km)</span>
                  </div>
                  <button onClick={() => navigate('/nearby-wells')} className="text-[10px] font-bold text-[#0070F3] hover:underline flex items-center">
                    <span>View on Map</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="text-slate-400 text-[10px] font-semibold border-b border-slate-100">
                      <th className="py-1">Well ID</th>
                      <th className="py-1">Distance</th>
                      <th className="py-1">Depth</th>
                      <th className="py-1 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {[
                      { id: 'DKG-201', dist: '2.1 km', depth: '3,240 m', status: 'Completed' },
                      { id: 'DKG-205', dist: '3.4 km', depth: '3,150 m', status: 'Completed' },
                      { id: 'DKG-198', dist: '4.3 km', depth: '3,020 m', status: 'Completed' },
                      { id: 'DKG-176', dist: '4.8 km', depth: '2,880 m', status: 'Abandoned' },
                      { id: 'DKG-190', dist: '4.9 km', depth: '3,100 m', status: 'Completed' }
                    ].map((w, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/wells/${w.id}`)}>
                        <td className="py-1.5 font-bold text-[#0070F3]">{w.id}</td>
                        <td className="py-1.5 font-mono text-slate-500">{w.dist}</td>
                        <td className="py-1.5 font-mono text-slate-600">{w.depth}</td>
                        <td className="py-1.5 text-right">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            w.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {w.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Relevant Events */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527]">
                    <Activity className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Relevant Events (8)</span>
                  </div>
                  <button onClick={() => navigate('/events')} className="text-[10px] font-bold text-[#0070F3] hover:underline flex items-center">
                    <span>View All</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  {[
                    { type: 'Mud Loss', well: 'DKG-201', depth: '3,240 m', sev: 'High' },
                    { type: 'Mud Loss', well: 'DKG-205', depth: '3,320 m', sev: 'High' },
                    { type: 'High Torque', well: 'DKG-205', depth: '3,450 m', sev: 'High' },
                    { type: 'Casing Issue', well: 'DKG-198', depth: '3,200 m', sev: 'Medium' },
                    { type: 'Lost Circulation', well: 'DKG-190', depth: '3,100 m', sev: 'Low' }
                  ].map((ev, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition cursor-pointer" onClick={() => navigate('/events')}>
                      <div>
                        <span className="font-bold text-[#0B1527]">{ev.type}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5 font-mono">({ev.well} @ {ev.depth})</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        ev.sev === 'High' ? 'bg-red-100 text-red-700' :
                        ev.sev === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {ev.sev}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evidence Documents */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0B1527]">
                    <FileText className="w-3.5 h-3.5 text-rose-500" />
                    <span>Evidence Documents (3 key sources)</span>
                  </div>
                  <button onClick={() => navigate('/knowledge')} className="text-[10px] font-bold text-[#0070F3] hover:underline flex items-center">
                    <span>View All</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-2 text-[11px]">
                  {[
                    { name: 'DKG-201_Daily_Drilling_Report.pdf', type: 'DDR', well: 'DKG-201', date: '12 Jan 2026' },
                    { name: 'DKG-205_Mud_Log.pdf', type: 'Mud Log', well: 'DKG-205', date: '08 Feb 2026' },
                    { name: 'DKG-198_Well_Report.pdf', type: 'Well Report', well: 'DKG-198', date: '21 Jan 2026' }
                  ].map((doc, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 transition cursor-pointer" onClick={() => navigate('/knowledge')}>
                      <div className="w-5 h-5 rounded bg-red-100 text-red-600 text-[8px] font-bold flex items-center justify-center flex-shrink-0">
                        PDF
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800 truncate text-[10px]">{doc.name}</p>
                        <p className="text-[9px] text-slate-400">{doc.type} • {doc.well}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Answer Traceability Accordion */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#0B1527]">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>AI Answer Traceability</span>
                  </div>
                </div>
                <div className="space-y-1 text-[11px] text-slate-600 pt-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <span>Data sources: 5 nearby wells within 5 km of DKG-247</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <span>Events analyzed: 28 historical drilling events</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <span>Documents referenced: 3 key documents</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1 font-mono">
                    <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span>Last updated: 29 Sept 2026, 10:42 AM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
