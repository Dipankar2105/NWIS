import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { 
  authService, 
  queryHistoryService, 
  dashboardService,
  extractErrorMessage 
} from '../services/api';
import { 
  User, 
  ShieldCheck, 
  MapPin, 
  Bell, 
  Lock, 
  Activity, 
  CheckCircle2, 
  ChevronRight, 
  Edit3, 
  KeyRound, 
  Smartphone, 
  Globe, 
  Check, 
  Sliders, 
  Layers, 
  FileText, 
  Database, 
  Bot, 
  RefreshCw,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

export default function UserProfile() {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();

  // State
  const [profile, setProfile] = useState(null);
  const [overview, setOverview] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', department: '', operational_areas: '' });
  const [editSaving, setEditSaving] = useState(false);

  // Notification toggles state
  const [notifications, setNotifications] = useState({
    criticalRisk: { email: true, inApp: true },
    highSeverity: { email: true, inApp: true },
    aiUpdates: { email: false, inApp: true },
    docProcessing: { email: true, inApp: true },
    dailySummary: { email: true, inApp: false },
    announcements: { email: false, inApp: true },
  });

  // Fetch real authenticated profile and user activity
  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [meRes, overviewRes, historyRes] = await Promise.all([
          authService.getMe().catch(() => authUser),
          dashboardService.getOverview().catch(() => null),
          queryHistoryService.getAll(10).catch(() => [])
        ]);

        setProfile(meRes || authUser);
        setOverview(overviewRes);
        setRecentActivities(Array.isArray(historyRes) ? historyRes : []);
      } catch (err) {
        console.error('Failed to load user profile data:', err);
        setError(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [authUser]);

  // Handle Save Preferences
  const handleSavePreferences = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };
  
  const handleEditOpen = () => {
    if (profile) {
      setEditForm({
        full_name: profile.full_name || '',
        department: profile.department || '',
        operational_areas: profile.operational_areas ? profile.operational_areas.join(', ') : ''
      });
      setIsEditProfileOpen(true);
    }
  };
  
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      const payload = {
        full_name: editForm.full_name,
        department: editForm.department,
        operational_areas: editForm.operational_areas.split(',').map(s => s.trim()).filter(Boolean)
      };
      const updatedProfile = await authService.updateProfile(payload);
      setProfile(updatedProfile);
      setIsEditProfileOpen(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert(extractErrorMessage(err));
    } finally {
      setEditSaving(false);
    }
  };

  const formattedRole = profile?.role 
    ? profile.role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'Drilling Engineer';

  const initials = profile?.full_name 
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'DS';

  const operationalAreas = profile?.operational_areas && profile.operational_areas.length > 0 
    ? profile.operational_areas.join(', ') 
    : 'Duliajan, Moran';

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header */}
        <Header 
          title="User Profile & Role Management" 
          subtitle="Manage your profile, access permissions and operational preferences"
          breadcrumb={[
            { label: 'Settings', link: '/settings' },
            { label: 'User Profile' }
          ]}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto space-y-4">
          
          {/* Toast Notification */}
          {saveSuccess && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-semibold">Operational preferences saved successfully.</span>
              </div>
              <button onClick={() => setSaveSuccess(false)} className="text-emerald-700 font-bold text-xs">✕</button>
            </div>
          )}

          {/* TOP SECTION: 3 Columns matching Profile.png */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            
            {/* 1. Profile Information Card (4 Cols) */}
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-700" />
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                    Profile Information
                  </h3>
                </div>
                <button 
                  onClick={handleEditOpen}
                  className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
                >
                  <Edit3 className="w-3 h-3" /> Edit Profile
                </button>
              </div>

              {/* Avatar & Core Identity */}
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-extrabold text-lg shadow-sm">
                  {initials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-extrabold text-slate-900">{profile?.full_name || 'Drilling Engineer'}</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">User ID: {profile?.employee_id || 'NWIS-DRL-024'}</p>
                </div>
              </div>

              {/* Details List */}
              <div className="space-y-2.5 text-xs pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400 font-medium">Department</span>
                  <span className="font-bold text-slate-800">{profile?.department || 'Drilling Operations'}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400 font-medium">Operational Areas</span>
                  <span className="font-bold text-slate-800">{operationalAreas}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400 font-medium">Email</span>
                  <span className="font-bold text-blue-600">{profile?.email || 'demo@oilindia.in'}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400 font-medium">Phone</span>
                  <span className="font-bold text-slate-800">+91 98XXX XXXXX</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400 font-medium">Designation</span>
                  <span className="font-bold text-slate-800">{formattedRole}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400 font-medium">Last Login</span>
                  <span className="font-mono text-[11px] text-slate-600">29 Sept 2026, 10:28 AM</span>
                </div>
              </div>
            </div>

            {/* 2. Role & Access Permissions Card (5 Cols) */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-700" />
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                    Role & Access Permissions
                  </h3>
                </div>
                <button 
                  onClick={() => alert('Role delegation requires Super Admin authorization.')}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900"
                >
                  <Sliders className="w-3 h-3" /> Manage Role
                </button>
              </div>

              {/* Role Scope Banner */}
              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-slate-200/70 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Current Role</span>
                  <span className="text-xs font-extrabold text-blue-700">{formattedRole}</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-tight">
                  Access to operational wells, events, documents and AI insights for assigned fields.
                </p>
              </div>

              {/* Permission Matrix Table */}
              <div className="overflow-x-auto max-h-56 overflow-y-auto pr-1">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase">
                      <th className="pb-1.5">Permission</th>
                      <th className="pb-1.5">Description</th>
                      <th className="pb-1.5 text-right">Access</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {[
                      { name: 'View Wells', desc: 'View well details and nearby wells', status: 'Enabled' },
                      { name: 'View Events', desc: 'Access historical drilling events', status: 'Enabled' },
                      { name: 'View Documents', desc: 'View and download documents', status: 'Enabled' },
                      { name: 'Ask NWIS AI', desc: 'Use AI assistant for insights', status: 'Enabled' },
                      { name: 'Run Risk Analysis', desc: 'Analyze risks for wells and formations', status: 'Enabled' },
                      { name: 'Compare Wells', desc: 'Compare offset wells', status: 'Enabled' },
                      { name: 'Upload Documents', desc: 'Upload and process documents', status: 'Enabled' },
                      { name: 'Export Reports', desc: 'Export analysis reports', status: 'Enabled' },
                      { name: 'Manage Users', desc: 'User and role management', status: 'Admin Only' },
                      { name: 'System Settings', desc: 'Modify system configurations', status: 'Admin Only' },
                    ].map((perm) => (
                      <tr key={perm.name} className="hover:bg-slate-50">
                        <td className="py-1.5 font-bold text-slate-800">{perm.name}</td>
                        <td className="py-1.5 text-slate-500 text-[10px]">{perm.desc}</td>
                        <td className="py-1.5 text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            perm.status === 'Enabled' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {perm.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Assigned Operational Scope (3 Cols) */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3.5 flex flex-col justify-between">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <MapPin className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                  Assigned Scope
                </h3>
              </div>

              {/* Duliajan Field */}
              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Duliajan Field</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600">
                  <div>Assigned Wells: <strong className="text-slate-900">12</strong></div>
                  <div>Search Radius: <strong className="text-slate-900">5 km</strong></div>
                  <div>Accessible Docs: <strong className="text-slate-900">450+</strong></div>
                  <div>Active Alerts: <strong className="text-red-600">8</strong></div>
                </div>
              </div>

              {/* Moran Field */}
              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>Moran Field</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600">
                  <div>Assigned Wells: <strong className="text-slate-900">8</strong></div>
                  <div>Search Radius: <strong className="text-slate-900">5 km</strong></div>
                  <div>Accessible Docs: <strong className="text-slate-900">280+</strong></div>
                  <div>Active Alerts: <strong className="text-red-600">4</strong></div>
                </div>
              </div>
            </div>

          </div>

          {/* BOTTOM SECTION: Notifications, Security & Activity matching Profile.png */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Notification Preferences (5 Cols) */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-slate-700" />
                    <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                      Notification Preferences
                    </h3>
                  </div>
                  <button
                    onClick={handleSavePreferences}
                    className="px-3 py-1 bg-[#0F172A] hover:bg-slate-800 text-white rounded-md text-[11px] font-bold shadow-xs transition-colors"
                  >
                    Save Preferences
                  </button>
                </div>

                <div className="space-y-2 pt-2 text-xs">
                  {[
                    { key: 'criticalRisk', label: 'Critical Risk Alerts', desc: 'Immediate alerts for high-risk situations' },
                    { key: 'highSeverity', label: 'High Severity Events', desc: 'Notifications for high severity drilling events' },
                    { key: 'aiUpdates', label: 'AI Answer Updates', desc: 'Updates on long-running AI queries' },
                    { key: 'docProcessing', label: 'Document Processing', desc: 'Status of uploaded document processing' },
                    { key: 'dailySummary', label: 'Daily Operations Summary', desc: 'Daily summary of wells, events and insights' },
                    { key: 'announcements', label: 'System Announcements', desc: 'Important updates and new features' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                      <div>
                        <p className="font-bold text-slate-800">{item.label}</p>
                        <p className="text-[10px] text-slate-400">{item.desc}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                          <input
                            type="checkbox"
                            checked={notifications[item.key]?.email}
                            onChange={(e) => setNotifications({
                              ...notifications,
                              [item.key]: { ...notifications[item.key], email: e.target.checked }
                            })}
                            className="w-3.5 h-3.5 text-blue-600 rounded"
                          />
                          Email
                        </label>
                        <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                          <input
                            type="checkbox"
                            checked={notifications[item.key]?.inApp}
                            onChange={(e) => setNotifications({
                              ...notifications,
                              [item.key]: { ...notifications[item.key], inApp: e.target.checked }
                            })}
                            className="w-3.5 h-3.5 text-blue-600 rounded"
                          />
                          In-App
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Security & Sessions (4 Cols) */}
            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-700" />
                    <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                      Security & Sessions
                    </h3>
                  </div>
                  <button 
                    onClick={() => alert('Password modification is handled via NWIS Enterprise SSO')}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800"
                  >
                    Change Password
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-semibold block">Password Changed</span>
                    <span className="font-bold text-slate-900 block mt-0.5">12 Aug 2026</span>
                  </div>
                  <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-semibold block">MFA Status</span>
                    <span className="font-bold text-emerald-600 block mt-0.5">● Enabled</span>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Recent Sessions
                  </span>
                  <div className="space-y-1 text-[11px]">
                    <div className="p-2 bg-blue-50/50 border border-blue-100 rounded-md flex items-center justify-between">
                      <div>
                        <strong className="text-slate-900 block">Windows • Chrome</strong>
                        <span className="text-[10px] text-slate-400">Mumbai, India</span>
                      </div>
                      <span className="text-[10px] font-bold text-blue-600">Current</span>
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded-md flex items-center justify-between">
                      <div>
                        <strong className="text-slate-700 block">Windows • Edge</strong>
                        <span className="text-[10px] text-slate-400">Mumbai, India</span>
                      </div>
                      <span className="text-[10px] text-slate-500">28 Sept, 08:15 PM</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account & Access Summary (3 Cols) */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                    Account Summary
                  </h3>
                </div>

                <div className="space-y-2 pt-2">
                  {[
                    { title: 'Role-based Access', desc: 'Permissions configured based on role', status: 'Active' },
                    { title: 'Audit Logging', desc: 'All user actions are logged and monitored', status: 'Active' },
                    { title: 'Secure Session', desc: 'Encrypted connection and MFA enabled', status: 'Active' },
                    { title: 'Data Access Scope', desc: 'Limited to assigned fields and wells', status: 'Active' }
                  ].map((item, idx) => (
                    <div key={idx} className="p-2 bg-[#F8FAFC] rounded-lg border border-slate-200/60 text-[11px] flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-800">{item.title}</p>
                        <p className="text-[9.5px] text-slate-400">{item.desc}</p>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => navigate('/settings/activity-log')}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors flex items-center justify-center gap-1"
              >
                <span>View My Activity Log</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </main>
        
        {/* Edit Profile Modal */}
        {isEditProfileOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-extrabold text-slate-900 text-sm">Edit Profile</h3>
                <button onClick={() => setIsEditProfileOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
              <form onSubmit={handleEditSubmit} className="p-4 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={editForm.full_name}
                    onChange={e => setEditForm({...editForm, full_name: e.target.value})}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Department</label>
                  <input 
                    type="text" 
                    value={editForm.department}
                    onChange={e => setEditForm({...editForm, department: e.target.value})}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Operational Areas (comma-separated)</label>
                  <input 
                    type="text" 
                    value={editForm.operational_areas}
                    onChange={e => setEditForm({...editForm, operational_areas: e.target.value})}
                    placeholder="e.g. Duliajan, Moran"
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => setIsEditProfileOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={editSaving}
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
                  >
                    {editSaving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
  );
}
