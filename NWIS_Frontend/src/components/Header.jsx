import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { eventsService, documentsService } from '../services/api';
import { useMobileSidebar } from './Sidebar';
import { 
  Search, 
  Bell, 
  MapPin, 
  ChevronDown, 
  ChevronRight,
  LogOut, 
  Check,
  Settings,
  AlertTriangle,
  Flame,
  CheckCircle2,
  RefreshCw,
  Layers,
  FileText,
  Clock,
  X,
  ExternalLink,
  ShieldAlert,
  Menu
} from 'lucide-react';

export default function Header({ 
  title = 'Drilling Operations Dashboard',
  subtitle = 'Real-time overview of nearby wells, drilling events and operational insights',
  breadcrumb = null,
  fields = ['Duliajan Field', 'Moran Field', 'Nahorkatiya Field', 'Borholla Field'],
  selectedField: propSelectedField,
  onSelectField: propOnSelectField
}) {
  const { user, logout } = useAuth();
  const { 
    selectedField: globalSelectedField, 
    setSelectedField: globalSetSelectedField, 
    activeAlerts, 
    notificationCount, 
    acknowledgeAlert, 
    refreshAlerts, 
    isLoadingAlerts, 
    lastUpdated, 
    triggerGlobalRefresh,
    wells,
    selectWell
  } = useApp();
  const mobileSidebar = useMobileSidebar();

  const activeField = propSelectedField || globalSelectedField || 'Duliajan Field';

  const handleSelectField = (field) => {
    if (globalSetSelectedField) globalSetSelectedField(field);
    if (propOnSelectField) propOnSelectField(field);
  };

  const navigate = useNavigate();
  
  // UI States
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ wells: [], events: [], docs: [] });
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const searchRef = useRef(null);
  const notificationRef = useRef(null);
  const userRef = useRef(null);
  const fieldRef = useRef(null);

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setShowNotificationPanel(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setShowUserDropdown(false);
      }
      if (fieldRef.current && !fieldRef.current.contains(e.target)) {
        setShowFieldDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live global search across wells, events, and documents
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ wells: [], events: [], docs: [] });
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const query = searchQuery.toLowerCase();
        // 1. Search in cached wells
        const matchedWells = wells.filter(w => 
          (w.name && w.name.toLowerCase().includes(query)) ||
          (w.well_name && w.well_name.toLowerCase().includes(query)) ||
          (w.field && w.field.toLowerCase().includes(query)) ||
          (w.formation && w.formation.toLowerCase().includes(query))
        ).slice(0, 4);

        // 2. Search in events
        const eventsRes = await eventsService.getAll({ page_size: 20 }).catch(() => []);
        const eventList = Array.isArray(eventsRes) ? eventsRes : (eventsRes?.events || eventsRes?.items || []);
        const matchedEvents = eventList.filter(e => 
          (e.event_type && e.event_type.toLowerCase().includes(query)) ||
          (e.well_name && e.well_name.toLowerCase().includes(query)) ||
          (e.formation && e.formation.toLowerCase().includes(query)) ||
          (e.description && e.description.toLowerCase().includes(query))
        ).slice(0, 3);

        // 3. Search in documents
        const docsRes = await documentsService.getAll().catch(() => []);
        const docList = Array.isArray(docsRes) ? docsRes : (docsRes?.documents || docsRes?.items || []);
        const matchedDocs = docList.filter(d => 
          (d.filename && d.filename.toLowerCase().includes(query)) ||
          (d.title && d.title.toLowerCase().includes(query)) ||
          (d.doc_type && d.doc_type.toLowerCase().includes(query))
        ).slice(0, 3);

        setSearchResults({
          wells: matchedWells,
          events: matchedEvents,
          docs: matchedDocs
        });
        setShowSearchDropdown(true);
      } catch (err) {
        console.warn('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, wells]);

  // Handle global manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await triggerGlobalRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Format role
  const formattedRole = user?.role 
    ? user.role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'Drilling Engineer';

  // User initials
  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'DS';

  // Format date & time
  const formattedDate = currentTime.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const formattedTime = currentTime.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return (
    <header className="bg-white border-b border-slate-200/90 px-5 lg:px-6 py-3 sticky top-0 z-30 select-none">
      <div className="flex flex-col gap-1.5 max-w-[1600px] mx-auto">
        {/* Top Header Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Mobile: Hamburger + Title */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger Button - Mobile Only */}
            <button
              className="md:hidden p-2 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
              onClick={() => mobileSidebar?.toggle()}
              aria-label="Open navigation menu"
              aria-expanded={mobileSidebar?.isOpen}
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Left: Page Title, Subtitle & Optional Breadcrumb */}
            <div className="min-w-0">
            {breadcrumb && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium mb-1">
                {breadcrumb.map((item, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-400" />}
                    {item.link ? (
                      <Link to={item.link} className="hover:text-slate-900 transition-colors">{item.label}</Link>
                    ) : (
                      <span className="text-slate-900 font-bold">{item.label}</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
            <h1 className="text-xl lg:text-[23px] font-extrabold text-[#0F172A] tracking-tight font-display leading-tight">
              {title}
            </h1>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              {subtitle}
            </p>
            </div>
          </div>

          {/* Right: Search, Field Selector, Notification Bell, User Profile */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 flex-shrink-0">
            
            {/* Live Global Search Bar */}
            <div className="relative w-48 sm:w-56 lg:w-64" ref={searchRef}>
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchQuery.trim()) setShowSearchDropdown(true); }}
                placeholder="Search wells, events, documents..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#F8FAFC] border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-red-600 focus:border-red-600 transition-all"
              />

              {/* Search Results Dropdown */}
              {showSearchDropdown && (
                <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl py-2 z-50 max-h-80 overflow-y-auto font-sans">
                  {searchResults.wells.length === 0 && searchResults.events.length === 0 && searchResults.docs.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-slate-400 text-center">
                      {isSearching ? 'Searching NWIS repository...' : 'No matching results found.'}
                    </div>
                  ) : (
                    <>
                      {/* Wells Category */}
                      {searchResults.wells.length > 0 && (
                        <div className="px-3 py-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1">Wells</div>
                          {searchResults.wells.map(w => (
                            <div
                              key={w.id || w.name}
                              onClick={() => {
                                selectWell(w.id || w.name);
                                setShowSearchDropdown(false);
                                setSearchQuery('');
                                navigate(`/wells/${w.id || w.name}`);
                              }}
                              className="px-2.5 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs transition"
                            >
                              <div className="flex items-center gap-2">
                                <Layers className="w-3.5 h-3.5 text-[#0070F3]" />
                                <span className="font-bold text-slate-800">{w.name || w.well_name || w.id}</span>
                              </div>
                              <span className="text-[10px] text-slate-400">{w.field || w.formation}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Events Category */}
                      {searchResults.events.length > 0 && (
                        <div className="px-3 py-1 border-t border-slate-100">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1 mt-1">Drilling Events</div>
                          {searchResults.events.map(ev => (
                            <div
                              key={ev.id}
                              onClick={() => {
                                setShowSearchDropdown(false);
                                setSearchQuery('');
                                navigate(`/events?eventId=${ev.id}`);
                              }}
                              className="px-2.5 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs transition"
                            >
                              <div className="flex items-center gap-2">
                                <Flame className="w-3.5 h-3.5 text-[#E11D48]" />
                                <span className="font-medium text-slate-800">{ev.event_type || ev.title} ({ev.well_name || 'Well'})</span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400">{ev.depth_m || ev.depth || '?'} m</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Documents Category */}
                      {searchResults.docs.length > 0 && (
                        <div className="px-3 py-1 border-t border-slate-100">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1 mt-1">Documents</div>
                          {searchResults.docs.map(doc => (
                            <div
                              key={doc.id}
                              onClick={() => {
                                setShowSearchDropdown(false);
                                setSearchQuery('');
                                navigate(`/knowledge`);
                              }}
                              className="px-2.5 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs transition"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <FileText className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                <span className="font-medium text-slate-800 truncate">{doc.filename || doc.title}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 uppercase">{doc.doc_type || 'PDF'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Field Dropdown Selector */}
            <div className="relative" ref={fieldRef}>
              <button
                type="button"
                onClick={() => setShowFieldDropdown(!showFieldDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F8FAFC] hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-slate-600" />
                <span>{activeField}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showFieldDropdown && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50">
                  {fields.map((field) => (
                    <button
                      key={field}
                      onClick={() => {
                        handleSelectField(field);
                        setShowFieldDropdown(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center justify-between ${
                        activeField === field ? 'font-bold text-red-700 bg-red-50/50' : 'text-slate-700'
                      }`}
                    >
                      <span>{field}</span>
                      {activeField === field && <Check className="w-3.5 h-3.5 text-red-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Bell with Live Active Alerts Center */}
            <div className="relative" ref={notificationRef}>
              <button 
                type="button"
                onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Notifications"
                title={`${notificationCount} Active Alerts`}
              >
                <Bell className="w-4 h-4" />
                {notificationCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-[#B91C1C] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs animate-pulse">
                    {notificationCount}
                  </span>
                )}
              </button>

              {/* Notification Center Dropdown Panel */}
              {showNotificationPanel && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl py-3 z-50 font-sans">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-[#E11D48]" />
                      <h3 className="text-xs font-bold text-slate-900">Notification Center</h3>
                      {notificationCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-red-100 text-red-700 font-bold text-[10px]">
                          {notificationCount} New
                        </span>
                      )}
                    </div>
                    <button
                      onClick={refreshAlerts}
                      disabled={isLoadingAlerts}
                      className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition"
                      title="Refresh Alerts"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingAlerts ? 'animate-spin text-[#0070F3]' : ''}`} />
                    </button>
                  </div>

                  {/* Notification List */}
                  <div className="max-h-72 overflow-y-auto px-2 py-1 space-y-1.5">
                    {activeAlerts.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                        <p className="font-bold text-slate-700">All Systems Nominal</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">No active alerts requiring attention.</p>
                      </div>
                    ) : (
                      activeAlerts.map(alert => {
                        const sev = alert.severity?.toLowerCase() || 'medium';
                        const isHigh = sev === 'high' || sev === 'critical';
                        return (
                          <div 
                            key={alert.id}
                            className={`p-2.5 rounded-xl border text-xs transition ${
                              isHigh 
                                ? 'bg-rose-50/60 border-rose-200 hover:bg-rose-50' 
                                : 'bg-amber-50/60 border-amber-200 hover:bg-amber-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 min-w-0">
                                <span className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                                  isHigh ? 'bg-red-600' : 'bg-amber-500'
                                }`} />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900 truncate">
                                      {alert.title || alert.alert_type?.replace('_', ' ').toUpperCase()}
                                    </span>
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                      isHigh ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                      {alert.severity || 'HIGH'}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-600 mt-0.5">
                                    Well: <strong className="text-slate-800">{alert.well_name || alert.active_well_id || 'Active Rig'}</strong> • {alert.depth_range || 'Formation Zone'}
                                  </p>
                                  {alert.description && (
                                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                                      {alert.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Alert Action Buttons */}
                            <div className="flex items-center justify-between pt-2 mt-1.5 border-t border-slate-200/60">
                              <button
                                onClick={() => {
                                  setShowNotificationPanel(false);
                                  navigate(`/risk?well=${alert.active_well_id || alert.well_name || ''}`);
                                }}
                                className="text-[10px] font-bold text-[#0070F3] hover:underline flex items-center gap-0.5"
                              >
                                <span>Analyze Risk</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>

                              <button
                                onClick={async () => {
                                  await acknowledgeAlert(alert.id);
                                }}
                                className="px-2.5 py-0.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-md text-[10px] font-bold shadow-xs transition"
                              >
                                Acknowledge
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-4 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <button 
                      onClick={() => { setShowNotificationPanel(false); navigate('/alerts'); }}
                      className="font-bold text-[#0070F3] hover:underline"
                    >
                      View All Alerts →
                    </button>
                    <span className="text-slate-400 font-mono text-[10px]">
                      Updated {new Date(lastUpdated).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill & Dropdown */}
            <div className="relative border-l border-slate-200 pl-2.5" ref={userRef}>
              <button
                type="button"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 hover:opacity-90 focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-[#0A1322] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-sm">
                  {initials}
                </div>
                <div className="hidden sm:flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-800 leading-tight">
                    {formattedRole}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </div>
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{user?.full_name || 'Drilling Engineer'}</p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{user?.email || 'demo@oilindia.in'}</p>
                    <span className="inline-block mt-1.5 px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded capitalize">
                      {user?.role?.replace('_', ' ') || 'drilling engineer'}
                    </span>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setShowUserDropdown(false); navigate('/settings/profile'); }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      User Profile & Roles
                    </button>
                    <button
                      onClick={() => { setShowUserDropdown(false); navigate('/settings/system'); }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      System Settings
                    </button>
                    <button
                      onClick={logout}
                      className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-500" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Timestamp & Status Metadata Bar (Right-aligned under header matching designs) */}
        <div className="flex items-center justify-end gap-3 text-[11px] text-slate-500 font-medium select-none">
          <span>{formattedDate} | {formattedTime}</span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-semibold transition"
            title="Click to trigger global data refresh"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" />
            <span>Last updated: Just now</span>
            <RefreshCw className={`w-3 h-3 ml-0.5 text-emerald-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

      </div>
    </header>
  );
}