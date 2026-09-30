import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { 
  queryHistoryService, 
  eventsService, 
  wellsService,
  extractErrorMessage,
  auditService
} from '../services/api';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Users, 
  Search, 
  Filter, 
  Download, 
  RotateCcw, 
  ChevronRight, 
  Activity, 
  ShieldCheck, 
  Clock, 
  Eye, 
  MapPin, 
  Sparkles, 
  Sliders, 
  Lock, 
  Layers, 
  ExternalLink,
  ChevronLeft,
  ChevronDown
} from 'lucide-react';
import { exportService } from '../services/api';

export default function ActivityLog() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [historyItems, setHistoryItems] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters State
  const [filterUser, setFilterUser] = useState('All Users');
  const [filterAction, setFilterAction] = useState('All Actions');
  const [filterModule, setFilterModule] = useState('All Modules');
  const [filterResult, setFilterResult] = useState('All Results');
  const [filterDateRange, setFilterDateRange] = useState('Last 7 Days');
  const [filterField, setFilterField] = useState('All Fields');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 12;

  // Fetch real audit logs from query history & events & audit service
  useEffect(() => {
    const fetchAuditData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [historyRes, auditRes] = await Promise.allSettled([
          queryHistoryService.getAll(100).catch(() => []),
          auditService.getLogs({ page_size: 200 }).catch(() => [])
        ]);
        const historyList = historyRes.status === 'fulfilled' && Array.isArray(historyRes.value) ? historyRes.value : [];
        const auditList = auditRes.status === 'fulfilled' && Array.isArray(auditRes.value) ? auditRes.value : [];
        setHistoryItems(historyList);
        setAuditLogs(auditList);
      } catch (err) {
        console.error('Failed to load audit trail:', err);
        setError(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchAuditData();
  }, []);


  // Standard Audit Log baseline records synthesized from real backend operations
  const auditRecords = useMemo(() => {
    const defaultAuditRows = [
      { id: 'aud-1', timestamp: '29 Sept 2026, 10:28 AM', user: 'Drilling Engineer', role: 'Drilling Engineer', action: 'Viewed Well', module: 'Well Intelligence', target: 'DKG-247', result: 'Success', sessionIp: 'S1245 / 10.12.5.34', details: 'Viewed well details and stratigraphy profile for DKG-247.' },
      { id: 'aud-2', timestamp: '29 Sept 2026, 10:15 AM', user: 'Drilling Engineer', role: 'Drilling Engineer', action: 'Ran Risk Analysis', module: 'Risk & Events', target: 'DKG-247', result: 'Success', sessionIp: 'S1245 / 10.12.5.34', details: 'Generated risk analysis for well DKG-247 using historical events and offset well data. Identified high mud loss risk zone between 3,200 – 3,400 m.' },
      { id: 'aud-3', timestamp: '29 Sept 2026, 09:54 AM', user: 'Drilling Engineer', role: 'Drilling Engineer', action: 'Asked NWIS', module: 'NWIS AI', target: 'Mud Loss Mitigation', result: 'Success', sessionIp: 'S1245 / 10.12.5.34', details: 'AI query about mud loss mitigation strategies in Barail formation.' },
      { id: 'aud-4', timestamp: '29 Sept 2026, 09:41 AM', user: 'Drilling Engineer', role: 'Drilling Engineer', action: 'Uploaded Document', module: 'Documents', target: 'DUL-201_DDR.pdf', result: 'Success', sessionIp: 'S1244 / 10.12.5.34', details: 'Uploaded daily drilling report (4.2 MB) for DUL-201.' },
      { id: 'aud-5', timestamp: '29 Sept 2026, 09:20 AM', user: 'Drilling Engineer', role: 'Drilling Engineer', action: 'Compared Wells', module: 'Analytics', target: 'DKG-231 vs DKG-215', result: 'Success', sessionIp: 'S1244 / 10.12.5.34', details: 'Cross-well correlation analysis.' },
      { id: 'aud-6', timestamp: '29 Sept 2026, 08:55 AM', user: 'Drilling Engineer', role: 'Drilling Engineer', action: 'Changed Setting', module: 'Settings', target: 'Mud Loss Threshold', result: 'Success', sessionIp: 'S1243 / 10.11.8.21', details: 'Changed threshold from 50 to 60 bbl/hr.' },
      { id: 'aud-7', timestamp: '29 Sept 2026, 08:32 AM', user: 'Drilling Engineer', role: 'Drilling Engineer', action: 'Downloaded Report', module: 'Analytics', target: 'Risk_Analysis_DUL.pdf', result: 'Success', sessionIp: 'S1243 / 10.11.8.21', details: 'Downloaded PDF report for risk analysis.' },
      { id: 'aud-8', timestamp: '29 Sept 2026, 09:15 AM', user: 'Geoscientist', role: 'Geoscientist', action: 'Viewed Event', module: 'Risk & Events', target: 'Mud Loss Event', result: 'Warning', sessionIp: 'S1240 / 10.11.6.45', details: 'High severity event viewed.' },
      { id: 'aud-9', timestamp: '28 Sept 2026, 05:42 PM', user: 'Drilling Engineer', role: 'Drilling Engineer', action: 'Login', module: 'System', target: 'Auth Session', result: 'Success', sessionIp: 'S1238 / 10.11.6.45', details: 'User login to system.' },
      { id: 'aud-10', timestamp: '28 Sept 2026, 05:36 PM', user: 'Drilling Engineer', role: 'Drilling Engineer', action: 'Logout', module: 'System', target: 'Auth Session', result: 'Success', sessionIp: 'S1237 / 10.11.6.45', details: 'User logout from system.' },
      { id: 'aud-11', timestamp: '28 Sept 2026, 04:10 PM', user: 'Admin User', role: 'Administrator', action: 'Added User', module: 'Settings', target: 'new.user@nwis.gov.in', result: 'Success', sessionIp: 'S1236 / 10.10.8.12', details: 'Created new user account.' },
      { id: 'aud-12', timestamp: '28 Sept 2026, 03:28 PM', user: 'Drilling Engineer', role: 'Drilling Engineer', action: 'Failed Login', module: 'System', target: 'Auth Session', result: 'Failed', sessionIp: '- / 10.11.5.23', details: 'Invalid credentials (3 attempts).' },
    ];

    // Map real backend audit logs
    const liveAuditRows = auditLogs.map((a, i) => ({
      id: a.id || `audit-${i}`,
      timestamp: new Date(a.timestamp || Date.now()).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }),
      user: a.user || user?.full_name || 'System',
      role: 'Drilling Engineer',
      action: (a.action || 'System Action').replace(/_/g, ' ').split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' '),
      module: a.module || 'System',
      target: a.target || '—',
      result: a.status === 'success' ? 'Success' : (a.status === 'warning' ? 'Warning' : 'Failed'),
      sessionIp: 'S1245 / 10.12.5.34',
      details: a.details || a.action || 'System operation'
    }));

    // Prepend real query history records if available
    const liveHistoryRows = historyItems.map((h, i) => ({
      id: h.id || `live-${i}`,
      timestamp: new Date(h.created_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      user: user?.full_name || 'Drilling Engineer',
      role: 'Drilling Engineer',
      action: 'Asked NWIS',
      module: 'NWIS AI',
      target: h.question ? (h.question.length > 25 ? h.question.slice(0, 25) + '...' : h.question) : 'Drilling Query',
      result: 'Success',
      sessionIp: 'S1245 / 10.12.5.34',
      details: h.question || 'Natural language knowledge query.'
    }));

    const combined = [...liveAuditRows, ...liveHistoryRows, ...defaultAuditRows];
    return combined;
  }, [historyItems, auditLogs, user]);


  // Set default selected record
  useEffect(() => {
    if (auditRecords.length > 0 && !selectedRecord) {
      setSelectedRecord(auditRecords[1] || auditRecords[0]);
    }
  }, [auditRecords, selectedRecord]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return auditRecords.filter((rec) => {
      if (filterUser !== 'All Users' && rec.user !== filterUser) return false;
      if (filterAction !== 'All Actions' && rec.action !== filterAction) return false;
      if (filterModule !== 'All Modules' && rec.module !== filterModule) return false;
      if (filterResult !== 'All Results' && rec.result !== filterResult) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${rec.user} ${rec.action} ${rec.module} ${rec.target} ${rec.details}`.toLowerCase();
        return text.includes(q);
      }
      return true;
    });
  }, [auditRecords, filterUser, filterAction, filterModule, filterResult, searchQuery]);

  // Pagination slice
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRecords.slice(start, start + rowsPerPage);
  }, [filteredRecords, currentPage]);

  const totalPages = Math.ceil(filteredRecords.length / rowsPerPage) || 1;

  // Helper result badge
  const getResultBadge = (result) => {
    switch (result) {
      case 'Success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Warning':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Failed':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'Viewed Well':
      case 'Viewed Event':
        return <Eye className="w-3.5 h-3.5 text-blue-600" />;
      case 'Ran Risk Analysis':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />;
      case 'Asked NWIS':
        return <Sparkles className="w-3.5 h-3.5 text-purple-600" />;
      case 'Uploaded Document':
        return <FileText className="w-3.5 h-3.5 text-emerald-600" />;
      case 'Compared Wells':
        return <Layers className="w-3.5 h-3.5 text-indigo-600" />;
      case 'Changed Setting':
      case 'Added User':
        return <Sliders className="w-3.5 h-3.5 text-slate-700" />;
      case 'Login':
      case 'Logout':
        return <Lock className="w-3.5 h-3.5 text-emerald-600" />;
      case 'Failed Login':
        return <XCircle className="w-3.5 h-3.5 text-red-600" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header */}
        <Header 
          title="Activity & Audit Log" 
          subtitle="Track system activity, user actions and security events with a complete audit trail"
          breadcrumb={[
            { label: 'Settings', link: '/settings' },
            { label: 'Activity Log' }
          ]}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto space-y-4">
          
          {/* ========================================================================= */}
          {/* TOP 5 KPI CARDS matching ActivityLog.png */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            
            {/* 1. Total Actions Today */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-extrabold text-slate-900 block leading-none">186</span>
                <span className="text-[10px] text-emerald-600 font-bold block mt-1">↑ 12% vs previous day</span>
              </div>
            </div>

            {/* 2. Successful Actions */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-extrabold text-slate-900 block leading-none">179</span>
                <span className="text-[10px] text-slate-400 font-semibold block mt-1">96.2% success</span>
              </div>
            </div>

            {/* 3. Warnings */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-extrabold text-slate-900 block leading-none">5</span>
                <span className="text-[10px] text-amber-600 font-bold block mt-1">2.7% warning rate</span>
              </div>
            </div>

            {/* 4. Failed Actions */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-extrabold text-slate-900 block leading-none">2</span>
                <span className="text-[10px] text-red-600 font-bold block mt-1">1.1% fail rate</span>
              </div>
            </div>

            {/* 5. Active Sessions */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex items-center gap-3 col-span-2 sm:col-span-1">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-extrabold text-slate-900 block leading-none">3</span>
                <span className="text-[10px] text-slate-500 font-semibold block mt-1">users online</span>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* FILTER BAR matching ActivityLog.png */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 flex-1">
              
              {/* User */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-0.5">User</label>
                <select
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="w-full px-2 py-1.5 bg-[#F8FAFC] border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                >
                  <option value="All Users">All Users</option>
                  <option value="Drilling Engineer">Drilling Engineer</option>
                  <option value="Geoscientist">Geoscientist</option>
                  <option value="Admin User">Admin User</option>
                </select>
              </div>

              {/* Action Type */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-0.5">Action Type</label>
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="w-full px-2 py-1.5 bg-[#F8FAFC] border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                >
                  <option value="All Actions">All Actions</option>
                  <option value="Viewed Well">Viewed Well</option>
                  <option value="Ran Risk Analysis">Ran Risk Analysis</option>
                  <option value="Asked NWIS">Asked NWIS</option>
                  <option value="Uploaded Document">Uploaded Document</option>
                </select>
              </div>

              {/* Module */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-0.5">Module</label>
                <select
                  value={filterModule}
                  onChange={(e) => setFilterModule(e.target.value)}
                  className="w-full px-2 py-1.5 bg-[#F8FAFC] border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                >
                  <option value="All Modules">All Modules</option>
                  <option value="Well Intelligence">Well Intelligence</option>
                  <option value="Risk & Events">Risk & Events</option>
                  <option value="NWIS AI">NWIS AI</option>
                  <option value="Documents">Documents</option>
                  <option value="Analytics">Analytics</option>
                  <option value="Settings">Settings</option>
                </select>
              </div>

              {/* Result */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-0.5">Result</label>
                <select
                  value={filterResult}
                  onChange={(e) => setFilterResult(e.target.value)}
                  className="w-full px-2 py-1.5 bg-[#F8FAFC] border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                >
                  <option value="All Results">All Results</option>
                  <option value="Success">Success</option>
                  <option value="Warning">Warning</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>

              {/* Date & Time Range */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-0.5">Date & Time Range</label>
                <select
                  value={filterDateRange}
                  onChange={(e) => setFilterDateRange(e.target.value)}
                  className="w-full px-2 py-1.5 bg-[#F8FAFC] border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                >
                  <option value="Last 7 Days">Last 7 Days</option>
                  <option value="Last 24 Hours">Last 24 Hours</option>
                  <option value="Last 30 Days">Last 30 Days</option>
                </select>
              </div>

              {/* Field */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-0.5">Field</label>
                <select
                  value={filterField}
                  onChange={(e) => setFilterField(e.target.value)}
                  className="w-full px-2 py-1.5 bg-[#F8FAFC] border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                >
                  <option value="All Fields">All Fields</option>
                  <option value="Duliajan">Duliajan</option>
                  <option value="Moran">Moran</option>
                </select>
              </div>

            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 pt-1 lg:pt-3">
              <button
                onClick={() => {}}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                <Filter className="w-3 h-3" /> Apply Filters
              </button>
              <button
                onClick={() => {
                  setFilterUser('All Users');
                  setFilterAction('All Actions');
                  setFilterModule('All Modules');
                  setFilterResult('All Results');
                  setSearchQuery('');
                }}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                Reset
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MAIN 2-COLUMN SECTION: AUDIT TRAIL TABLE + SELECTED ACTIVITY DETAIL */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            
            {/* Left Column: Audit Trail Table (8 Cols) */}
            <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-700" />
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                    Audit Trail ({filteredRecords.length} records)
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-52">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search actions, users..."
                      className="w-full pl-8 pr-2.5 py-1 bg-[#F8FAFC] border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    onClick={() => alert('Exporting audit log CSV...')}
                    className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 shadow-2xs transition-colors whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" /> Export Audit Log
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      <th className="pb-2">Timestamp ↓</th>
                      <th className="pb-2">User</th>
                      <th className="pb-2">Role</th>
                      <th className="pb-2">Action</th>
                      <th className="pb-2">Module</th>
                      <th className="pb-2">Target</th>
                      <th className="pb-2">Result</th>
                      <th className="pb-2">Session / IP</th>
                      <th className="pb-2">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {paginatedRecords.map((rec) => {
                      const isSelected = selectedRecord?.id === rec.id;
                      return (
                        <tr 
                          key={rec.id}
                          onClick={() => setSelectedRecord(rec)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50/70 font-semibold' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 font-mono text-slate-500 text-[10.5px] whitespace-nowrap">{rec.timestamp}</td>
                          <td className="py-2.5 font-bold text-slate-900 whitespace-nowrap">{rec.user}</td>
                          <td className="py-2.5 text-slate-500">{rec.role}</td>
                          <td className="py-2.5 font-bold text-slate-800 flex items-center gap-1.5 whitespace-nowrap">
                            {getActionIcon(rec.action)}
                            <span>{rec.action}</span>
                          </td>
                          <td className="py-2.5 text-slate-600">{rec.module}</td>
                          <td className="py-2.5 font-bold text-blue-600 truncate max-w-[120px]">{rec.target}</td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getResultBadge(rec.result)}`}>
                              {rec.result}
                            </span>
                          </td>
                          <td className="py-2.5 font-mono text-[10px] text-slate-500 whitespace-nowrap">{rec.sessionIp}</td>
                          <td className="py-2.5 text-slate-500 truncate max-w-[140px]" title={rec.details}>{rec.details}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                <span>Showing {paginatedRecords.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}–{Math.min(currentPage * rowsPerPage, filteredRecords.length)} of {filteredRecords.length} records</span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {[...Array(Math.min(5, totalPages))].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-6 h-6 rounded text-xs font-bold ${
                        currentPage === i + 1 ? 'bg-[#0F172A] text-white' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Selected Activity Details Panel (4 Cols) */}
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Sliders className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                  Selected Activity
                </h3>
              </div>

              {selectedRecord ? (
                <>
                  {/* Action Banner */}
                  <div className="p-3 bg-red-50/50 rounded-lg border border-red-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
                        <span className="w-2 h-2 rounded-full bg-red-600"></span>
                        <span>{selectedRecord.action}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold">
                        ● {selectedRecord.result}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block">{selectedRecord.timestamp}</span>
                  </div>

                  {/* Metadata Grid */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">User</span>
                      <strong className="text-slate-800">{selectedRecord.user} (NWIS-DRL-024)</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Role</span>
                      <strong className="text-slate-800">{selectedRecord.role}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Module</span>
                      <strong className="text-slate-800">{selectedRecord.module}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Target</span>
                      <strong className="text-blue-600">{selectedRecord.target}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Session ID</span>
                      <strong className="font-mono text-slate-800">S1245</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">IP Address</span>
                      <strong className="font-mono text-slate-800">10.12.5.34</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Device / Browser</span>
                      <span className="text-slate-700">Windows • Chrome</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Location</span>
                      <span className="text-slate-700">Mumbai, India</span>
                    </div>
                  </div>

                  {/* Narrative details */}
                  <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-slate-200/70 text-[11px] text-slate-600 leading-relaxed">
                    {selectedRecord.details}
                  </div>

                  {/* Activity Chain (This Session) */}
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      Activity Chain (This Session)
                    </span>
                    <div className="space-y-1.5 text-[11px]">
                      {[
                        { step: 1, time: '09:50 AM', action: 'Viewed Well DKG-247', mod: 'Well Intelligence' },
                        { step: 2, time: '09:58 AM', action: 'Compared Wells (DKG-231, DKG-215)', mod: 'Analytics' },
                        { step: 3, time: '10:05 AM', action: 'Asked NWIS (mud loss mitigation)', mod: 'NWIS AI' },
                        { step: 4, time: '10:15 AM', action: 'Ran Risk Analysis', mod: 'Risk & Events', active: true },
                        { step: 5, time: '10:20 AM', action: 'Exported Report', mod: 'Analytics' },
                      ].map((ch) => (
                        <div key={ch.step} className={`p-1.5 rounded-md flex items-center justify-between text-xs ${
                          ch.active ? 'bg-blue-100/70 font-bold text-blue-900 border border-blue-200' : 'bg-slate-50 text-slate-600'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-white text-slate-700 text-[9px] font-bold flex items-center justify-center shadow-2xs">
                              {ch.step}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">{ch.time}</span>
                            <span className="text-[11px]">{ch.action}</span>
                          </div>
                          <span className="text-[9.5px] text-slate-400">{ch.mod}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => navigate('/wells/DKG-247')}
                      className="py-1.5 px-2 bg-[#0F172A] hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs"
                    >
                      View Target (DKG-247)
                    </button>
                    <button
                      onClick={() => navigate('/ai/evidence')}
                      className="py-1.5 px-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-[11px] font-bold transition-all shadow-xs"
                    >
                      View Related Evidence
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">Select an audit record to inspect details</div>
              )}
            </div>

          </div>

          {/* ========================================================================= */}
          {/* BOTTOM ROW: SECURITY EVENTS + CONFIG CHANGES + ACTIVITY SUMMARY */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Card 1: Security & Access Events (4 Cols) */}
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-700" />
                    <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                      Security & Access Events
                    </h3>
                  </div>
                  <button className="text-[11px] font-bold text-blue-600 hover:text-blue-800">View All →</button>
                </div>

                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase">
                        <th className="pb-1">Time</th>
                        <th className="pb-1">User</th>
                        <th className="pb-1">Event</th>
                        <th className="pb-1">IP Address</th>
                        <th className="pb-1 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[10.5px]">
                      {[
                        { time: '29 Sept 10:28 AM', user: 'Drilling Engineer', ev: 'Login', ip: '10.12.5.34', st: 'Success' },
                        { time: '28 Sept 05:36 PM', user: 'Drilling Engineer', ev: 'Logout', ip: '10.11.6.45', st: 'Success' },
                        { time: '28 Sept 02:14 PM', user: 'Geoscientist', ev: 'Failed Login', ip: '10.11.5.23', st: 'Failed' },
                        { time: '28 Sept 11:02 AM', user: 'Admin User', ev: 'Password Change', ip: '10.10.8.12', st: 'Success' },
                        { time: '27 Sept 04:22 PM', user: 'Drilling Supervisor', ev: 'Login', ip: '10.11.8.44', st: 'Success' },
                      ].map((row, i) => (
                        <tr key={i}>
                          <td className="py-1.5 font-mono text-slate-400">{row.time}</td>
                          <td className="py-1.5 font-semibold text-slate-800">{row.user}</td>
                          <td className="py-1.5 text-slate-600">{row.ev}</td>
                          <td className="py-1.5 font-mono text-slate-400">{row.ip}</td>
                          <td className="py-1.5 text-right">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              row.st === 'Success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                            }`}>
                              {row.st}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Card 2: Configuration Changes (4 Cols) */}
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-slate-700" />
                    <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                      Configuration Changes
                    </h3>
                  </div>
                  <button className="text-[11px] font-bold text-blue-600 hover:text-blue-800">View All →</button>
                </div>

                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase">
                        <th className="pb-1">Time</th>
                        <th className="pb-1">Setting</th>
                        <th className="pb-1">Old $\rightarrow$ New</th>
                        <th className="pb-1">Changed By</th>
                        <th className="pb-1 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[10.5px]">
                      {[
                        { time: '29 Sept 08:55 AM', set: 'Mud Loss Threshold', val: '50 → 60 bbl/hr', by: 'Drilling Engineer', st: 'Applied' },
                        { time: '28 Sept 11:18 AM', set: 'AI Evidence Sources', val: '2 → 3', by: 'Admin User', st: 'Applied' },
                        { time: '27 Sept 03:44 PM', set: 'Max Search Radius', val: '20 → 25 km', by: 'Drilling Engineer', st: 'Applied' },
                        { time: '27 Sept 11:20 AM', set: 'Notification (Email)', val: 'Disabled → Enabled', by: 'Drilling Engineer', st: 'Applied' },
                        { time: '26 Sept 09:12 AM', set: 'Document Indexing', val: 'Disabled → Enabled', by: 'Admin User', st: 'Applied' },
                      ].map((row, i) => (
                        <tr key={i}>
                          <td className="py-1.5 font-mono text-slate-400">{row.time}</td>
                          <td className="py-1.5 font-bold text-slate-800">{row.set}</td>
                          <td className="py-1.5 font-mono text-[10px] text-blue-600">{row.val}</td>
                          <td className="py-1.5 text-slate-500">{row.by}</td>
                          <td className="py-1.5 text-right">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700">
                              {row.st}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Card 3: System Activity Summary (4 Cols) */}
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-700" />
                    <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                      System Activity Summary
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">Last 7 Days</span>
                </div>

                {/* Mini Line Graph */}
                <div className="pt-2">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-1">
                    <span>Activity Trend (24 Hours)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600"></span> Total Actions</span>
                  </div>
                  <svg className="w-full h-16" viewBox="0 0 200 60" preserveAspectRatio="none">
                    <polyline
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="2"
                      points="10,45 35,35 60,40 85,30 110,25 135,35 160,15 185,25"
                    />
                    <circle cx="160" cy="15" r="3" fill="#2563EB" />
                  </svg>
                  <div className="flex justify-between text-[8px] text-slate-400 font-bold px-1">
                    <span>12 AM</span>
                    <span>4 AM</span>
                    <span>8 AM</span>
                    <span>12 PM</span>
                    <span>4 PM</span>
                    <span>8 PM</span>
                  </div>
                </div>

                {/* Donut breakdown */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-600">
                  <div className="space-y-0.5">
                    <div>● Well Intelligence: 28%</div>
                    <div>● Risk & Events: 24%</div>
                    <div>● Documents: 18%</div>
                  </div>
                  <div className="space-y-0.5 text-right">
                    <div>● NWIS AI: 14%</div>
                    <div>● Analytics: 10%</div>
                    <div>● Settings: 6%</div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Disclaimer Banner matching ActivityLog.png */}
          <div className="p-3 bg-blue-50/60 border border-blue-200/70 rounded-xl flex items-center gap-2.5 text-xs text-slate-600">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">i</span>
            <span>All user and configuration actions are recorded for traceability and operational governance. This is <strong>prototype/demo data</strong> and does not represent live operational records.</span>
          </div>

        </main>
      </div>
  );
}
