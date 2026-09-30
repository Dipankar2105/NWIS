import React, { useState, createContext, useContext, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Home, Map, AlertTriangle, FileText, Bot, BarChart3, Settings,
  ChevronRight, ChevronDown, LogOut, Sparkles, X, Menu
} from 'lucide-react';

// ---- Mobile Sidebar Context (for hamburger in Header) ----
const MobileSidebarContext = createContext(null);

export function useMobileSidebar() {
  return useContext(MobileSidebarContext);
}

export function MobileSidebarProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen(p => !p);
  return (
    <MobileSidebarContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </MobileSidebarContext.Provider>
  );
}

function SidebarContent({ onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-close on navigation (mobile)
  useEffect(() => {
    if (onClose) onClose();
  }, [location.pathname]); // eslint-disable-line

  const isWellRoute = location.pathname.startsWith('/wells') || 
    location.pathname.startsWith('/nearby-wells') ||
    location.pathname.startsWith('/comparison');
  const isRiskRoute = location.pathname.startsWith('/risk') || 
    location.pathname.startsWith('/events') || 
    location.pathname.startsWith('/alerts');
  const isDocRoute = location.pathname.startsWith('/documents') ||
    location.pathname.startsWith('/knowledge') ||
    location.pathname.startsWith('/upload-processing') ||
    location.pathname.startsWith('/document-management');
  const isAiRoute = location.pathname.startsWith('/ai');
  const isAnalyticsRoute = location.pathname.startsWith('/analytics') || 
    location.pathname.startsWith('/cross-well-correlation');
  const isSettingsRoute = location.pathname.startsWith('/settings') || 
    location.pathname.startsWith('/profile') || 
    location.pathname.startsWith('/activity-log');

  const [wellMenuOpen, setWellMenuOpen] = useState(isWellRoute || true);
  const [riskMenuOpen, setRiskMenuOpen] = useState(isRiskRoute || true);
  const [docMenuOpen, setDocMenuOpen] = useState(isDocRoute || true);
  const [aiMenuOpen, setAiMenuOpen] = useState(isAiRoute || true);
  const [analyticsMenuOpen, setAnalyticsMenuOpen] = useState(isAnalyticsRoute || true);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(isSettingsRoute);

  const wellSubItems = [
    { name: 'Nearby Wells', path: '/nearby-wells' },
    { name: 'Well Details', path: '/wells/DUL-235' },
    { name: 'Offset Comparison', path: '/comparison' },
    { name: 'Well Map View', path: '/wells/map' },
  ];
  const riskSubItems = [
    { name: 'Risk Analysis', path: '/risk' },
    { name: 'Event History', path: '/events' },
    { name: 'Risk Alerts', path: '/alerts' },
  ];
  const docSubItems = [
    { name: 'Knowledge Repository', path: '/knowledge' },
    { name: 'Upload & Processing', path: '/upload-processing' },
  ];
  const aiSubItems = [
    { name: 'Chat & Ask', path: '/ai' },
    { name: 'Evidence Detail', path: '/ai/evidence' },
  ];
  const analyticsSubItems = [
    { name: 'Cross-Well Correlation', path: '/cross-well-correlation' },
    { name: 'Performance Analytics', path: '/analytics' },
    { name: 'Management View', path: '/analytics/management' },
  ];
  const settingsSubItems = [
    { name: 'System Settings', path: '/settings/system' },
    { name: 'User Profile & Roles', path: '/settings/profile' },
    { name: 'Activity & Audit Log', path: '/settings/activity-log' },
  ];

  const navBtnCls = (isActive) =>
    `w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all group ${
      isActive ? 'text-white font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-[#0E1B2E]'
    }`;

  const subItemCls = (active) =>
    `flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-medium transition-all relative ${
      active
        ? 'text-white font-bold bg-[#14233D]/60 before:absolute before:left-[-13px] before:top-2 before:bottom-2 before:w-[3px] before:bg-red-500 before:rounded-r'
        : 'text-slate-400 hover:text-slate-200 hover:bg-[#0E1B2E]/50'
    }`;

  function SubMenu({ items, open: menuOpen, pathCheck }) {
    if (!menuOpen) return null;
    return (
      <div className="mt-1 ml-4 pl-3 space-y-0.5 border-l border-slate-800">
        {items.map((item) => {
          const isActive = pathCheck ? pathCheck(item) : location.pathname === item.path;
          return (
            <NavLink key={item.name} to={item.path} className={subItemCls(isActive)}>
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-red-500' : 'bg-slate-500'}`} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#070E1A] text-slate-300 select-none">
      {/* Top Logo */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-[#162338] bg-[#050A14] flex-shrink-0">
        <img
          src="/assets/nwis-logo-dark.png"
          alt="NWIS - Nearby Wells Intelligence System"
          className="h-9 w-auto object-contain cursor-pointer"
          onClick={() => { navigate('/dashboard'); }}
        />
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-[#0E1B2E] rounded-lg transition-colors md:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {/* Dashboard */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all group ${
              isActive && !isWellRoute && !isRiskRoute && !isDocRoute && !isAiRoute
                ? 'bg-[#14233D] text-white font-bold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#0E1B2E]'
            }`
          }
        >
          <div className="flex items-center gap-3">
            <Home className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
            <span>Dashboard</span>
          </div>
        </NavLink>

        {/* Well Intelligence */}
        <div>
          <button type="button" onClick={() => setWellMenuOpen(p => !p)} className={navBtnCls(isWellRoute)}>
            <div className="flex items-center gap-3">
              <Map className={`w-4 h-4 ${isWellRoute ? 'text-white' : 'text-slate-400'} group-hover:text-slate-200 transition-colors`} />
              <span>Well Intelligence</span>
            </div>
            {wellMenuOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />}
          </button>
          <SubMenu items={wellSubItems} open={wellMenuOpen} pathCheck={(item) =>
            item.path.includes('/wells/DUL-235')
              ? location.pathname.startsWith('/wells/') || location.pathname === '/wells'
              : location.pathname === item.path
          } />
        </div>

        {/* Risk & Events */}
        <div>
          <button type="button" onClick={() => setRiskMenuOpen(p => !p)} className={navBtnCls(isRiskRoute)}>
            <div className="flex items-center gap-3">
              <AlertTriangle className={`w-4 h-4 ${isRiskRoute ? 'text-white' : 'text-slate-400'} group-hover:text-slate-200 transition-colors`} />
              <span>Risk & Events</span>
            </div>
            {riskMenuOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />}
          </button>
          <SubMenu items={riskSubItems} open={riskMenuOpen} pathCheck={(item) =>
            location.pathname === item.path ||
            (item.path === '/events' && location.pathname.startsWith('/events')) ||
            (item.path === '/risk' && location.pathname.startsWith('/risk'))
          } />
        </div>

        {/* Documents */}
        <div>
          <button type="button" onClick={() => setDocMenuOpen(p => !p)} className={navBtnCls(isDocRoute)}>
            <div className="flex items-center gap-3">
              <FileText className={`w-4 h-4 ${isDocRoute ? 'text-white' : 'text-slate-400'} group-hover:text-slate-200 transition-colors`} />
              <span>Documents</span>
            </div>
            {docMenuOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />}
          </button>
          <SubMenu items={docSubItems} open={docMenuOpen} />
        </div>

        {/* NWIS AI */}
        <div>
          <button type="button" onClick={() => setAiMenuOpen(p => !p)} className={navBtnCls(isAiRoute)}>
            <div className="flex items-center gap-3">
              <Bot className={`w-4 h-4 ${isAiRoute ? 'text-white' : 'text-slate-400'} group-hover:text-slate-200 transition-colors`} />
              <span>NWIS AI</span>
            </div>
            {aiMenuOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />}
          </button>
          <SubMenu items={aiSubItems} open={aiMenuOpen} />
        </div>

        {/* Analytics */}
        <div>
          <button type="button" onClick={() => setAnalyticsMenuOpen(p => !p)} className={navBtnCls(isAnalyticsRoute)}>
            <div className="flex items-center gap-3">
              <BarChart3 className={`w-4 h-4 ${isAnalyticsRoute ? 'text-white' : 'text-slate-400'} group-hover:text-slate-200 transition-colors`} />
              <span>Analytics</span>
            </div>
            {analyticsMenuOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />}
          </button>
          <SubMenu items={analyticsSubItems} open={analyticsMenuOpen} />
        </div>

        {/* Settings */}
        <div>
          <button type="button" onClick={() => setSettingsMenuOpen(p => !p)} className={navBtnCls(isSettingsRoute)}>
            <div className="flex items-center gap-3">
              <Settings className={`w-4 h-4 ${isSettingsRoute ? 'text-white' : 'text-slate-400'} group-hover:text-slate-200 transition-colors`} />
              <span>Settings</span>
            </div>
            {settingsMenuOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />}
          </button>
          <SubMenu items={settingsSubItems} open={settingsMenuOpen} pathCheck={(item) =>
            location.pathname === item.path ||
            (item.path === '/settings/system' && location.pathname === '/settings')
          } />
        </div>
      </nav>

      {/* User Footer */}
      <div className="p-3.5 border-t border-[#162338] bg-[#050A14]/90 relative overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:12px_12px]" />
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#1A2942] border border-[#2A3F60] text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 shadow-xs">
              {user?.full_name ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'DS'}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-200 truncate">{user?.full_name || 'Drilling Engineer'}</p>
              <p className="text-[10px] text-slate-400 capitalize truncate">{user?.role?.replace('_', ' ') || 'drilling engineer'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-[#14233D] rounded transition-colors flex-shrink-0"
            aria-label="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { isOpen, close } = useMobileSidebar() || { isOpen: false, close: () => {} };

  return (
    <>
      {/* Desktop: Permanent Sidebar */}
      <aside
        className="hidden md:flex w-[230px] lg:w-[240px] flex-col flex-shrink-0 min-h-screen border-r border-[#162338] z-20 sticky top-0 h-screen"
        aria-label="Main Navigation"
      >
        <SidebarContent />
      </aside>

      {/* Mobile: Drawer */}
      <>
        {/* Overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={close}
            aria-hidden="true"
          />
        )}
        {/* Drawer */}
        <aside
          className={`fixed inset-y-0 left-0 w-72 z-50 md:hidden transform transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-label="Mobile Navigation"
          aria-hidden={!isOpen}
        >
          <SidebarContent onClose={close} />
        </aside>
      </>
    </>
  );
}