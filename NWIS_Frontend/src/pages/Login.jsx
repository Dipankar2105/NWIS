import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage, systemService } from '../services/api';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  Loader2,
  X,
  MapPin,
  FileText,
  BarChart2
} from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, sessionExpiredMessage, clearExpiredMessage } = useAuth();

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Status & Error States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Live System Status
  const [systemHealth, setSystemHealth] = useState({
    nwis: 'Operational',
    knowledge: 'Operational',
    gis: 'Operational',
    lastUpdated: '5 Oct 2026, 1:24 AM'
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Fetch real backend system health status
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const health = await systemService.getHealth();
        if (health && health.status === 'healthy') {
          const now = new Date();
          const timeString = now.toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
          }) + ', ' + now.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          });

          setSystemHealth({
            nwis: 'Operational',
            knowledge: health.database === 'connected' ? 'Operational' : 'Degraded',
            gis: 'Operational',
            lastUpdated: timeString
          });
        }
      } catch (err) {
        console.warn('Live health ping note:', err.message);
      }
    };
    fetchHealth();
  }, []);

  // Form Validation
  const validateForm = () => {
    const errors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errors.email = 'Please enter your work email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Please enter a valid work email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    clearExpiredMessage();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email.trim(), password, rememberMe);
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      const msg = extractErrorMessage(err);
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen w-full bg-[#F8FAFC] overflow-x-hidden lg:overflow-hidden font-sans select-none">
      
      {/* ============================================================ */}
      {/* LEFT PANEL: Pristine Cropped Hero Visual from Design (100%)  */}
      {/* ============================================================ */}
      <div className="relative w-full lg:w-[66.4%] min-h-[420px] lg:h-screen bg-[#070D18] overflow-hidden flex-shrink-0">
        <img 
          src="/assets/login-hero-bg.png" 
          alt="NWIS — Nearby Wells Intelligence System" 
          className="w-full h-full object-cover object-left select-none pointer-events-none"
        />
        <span className="sr-only">
          NWIS — Nearby Wells Intelligence System — Turning Drilling Experience into Smarter Decisions. Access nearby wells, historical drilling events, operational knowledge and AI-driven insights to mitigate risks and improve well performance.
        </span>
      </div>

      {/* ============================================================ */}
      {/* RIGHT PANEL: Clean Off-White Login Panel matching Reference  */}
      {/* ============================================================ */}
      <div className="w-full lg:w-[33.6%] h-full lg:h-screen bg-[#F8FAFC] flex flex-col justify-between p-6 sm:p-8 lg:p-10 relative z-10 border-t lg:border-t-0 lg:border-l border-slate-200/80 overflow-y-auto lg:overflow-hidden">
        
        {/* Top-Right & Bottom-Right Geometric Watermark SVGs */}
        <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none opacity-30 z-0">
          <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-slate-300">
            <path d="M150 20L190 43V89L150 112L110 89V43L150 20Z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M190 43L150 66L110 43" stroke="currentColor" strokeWidth="1.5" />
            <path d="M150 66V112" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="150" cy="20" r="3" fill="currentColor" />
            <circle cx="190" cy="43" r="3" fill="currentColor" />
            <circle cx="110" cy="43" r="3" fill="currentColor" />
          </svg>
        </div>

        <div className="absolute bottom-0 right-0 w-56 h-56 pointer-events-none opacity-25 z-0">
          <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-slate-300">
            <path d="M160 100L190 117V152L160 169L130 152V117L160 100Z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M120 40L150 57V92L120 109L90 92V57L120 40Z" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>

        {/* Top Spacer */}
        <div className="hidden lg:block h-6" />

        {/* Main Authentication Box */}
        <div className="relative z-10 w-full max-w-[360px] mx-auto my-auto py-2">
          
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight font-display">
              Welcome back
            </h2>
            <p className="text-slate-500 font-normal text-xs sm:text-sm mt-1">
              Sign in to access NWIS.
            </p>
          </div>

          {/* Session Expired Notice */}
          {sessionExpiredMessage && (
            <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-amber-800 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>{sessionExpiredMessage}</span>
            </div>
          )}

          {/* Inline Error Notice */}
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-red-800 text-xs animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-900">Unable to sign in</p>
                <p className="text-red-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            
            {/* Work Email Field */}
            <div>
              <label 
                htmlFor="work-email" 
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Work email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="work-email"
                  type="email"
                  autoComplete="email"
                  disabled={isSubmitting}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
                  }}
                  placeholder="demo@oilindia.in"
                  className={`block w-full pl-10 pr-3.5 py-2.5 border text-slate-900 text-sm rounded-lg bg-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.email 
                      ? 'border-red-500 focus:ring-red-400 focus:border-red-500' 
                      : 'border-slate-200 focus:ring-[#035371]/20 focus:border-[#035371]'
                  } disabled:bg-slate-50 disabled:text-slate-500`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-red-600 text-xs mt-1 font-medium">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label 
                  htmlFor="password" 
                  className="block text-xs font-semibold text-slate-700"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-semibold text-[#0284C7] hover:text-[#0369A1] hover:underline focus:outline-none transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
                  }}
                  placeholder="demo123"
                  className={`block w-full pl-10 pr-10 py-2.5 border text-slate-900 text-sm rounded-lg bg-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.password 
                      ? 'border-red-500 focus:ring-red-400 focus:border-red-500' 
                      : 'border-slate-200 focus:ring-[#035371]/20 focus:border-[#035371]'
                  } disabled:bg-slate-50 disabled:text-slate-500`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-red-600 text-xs mt-1 font-medium">{fieldErrors.password}</p>
              )}
            </div>

            {/* Remember Device Checkbox */}
            <div className="flex items-center pt-0.5">
              <input
                id="remember-device"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#035371] focus:ring-[#035371] focus:ring-offset-0 cursor-pointer accent-[#035371]"
              />
              <label 
                htmlFor="remember-device" 
                className="ml-2.5 block text-xs text-slate-700 font-semibold cursor-pointer select-none"
              >
                Remember this device
              </label>
            </div>

            {/* Primary Sign In Button (Deep Teal #035371 - EXACT MATCH TO REFERENCE IMAGE) */}
            <button
              type="submit"
              id="sign-in-btn"
              disabled={isSubmitting}
              className="w-full h-11 flex items-center justify-center gap-2 px-5 py-2.5 border border-transparent rounded-lg text-white font-semibold text-sm bg-[#035371] hover:bg-[#02435C] active:bg-[#01354A] disabled:bg-[#035371]/60 disabled:cursor-not-allowed shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#035371] focus:ring-offset-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Access Security Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#F8FAFC] px-3 text-slate-400 font-medium">
                Authorized access only
              </span>
            </div>
          </div>

          {/* SYSTEM STATUS Card (Exact Match to Reference Image) */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-800">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-800">
                  SYSTEM STATUS
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-normal">
                Last updated: {systemHealth.lastUpdated}
              </span>
            </div>

            {/* Service Status Rows */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-sm" />
                  <span className="text-slate-700 font-medium">NWIS Services</span>
                </div>
                <span className="text-[#10B981] font-semibold text-xs">{systemHealth.nwis}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-sm" />
                  <span className="text-slate-700 font-medium">Knowledge Base</span>
                </div>
                <span className="text-[#10B981] font-semibold text-xs">{systemHealth.knowledge}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-sm" />
                  <span className="text-slate-700 font-medium">GIS Services</span>
                </div>
                <span className="text-[#10B981] font-semibold text-xs">{systemHealth.gis}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Links */}
        <div className="relative z-10 text-center pt-3 pb-1">
          <div className="flex justify-center items-center gap-3 text-[11px] text-slate-400 font-medium">
            <button 
              type="button"
              onClick={() => alert("NWIS Enterprise Platform - Privacy and Data Governance Policy")}
              className="hover:text-slate-600 transition-colors"
            >
              Privacy
            </button>
            <span className="text-slate-300">|</span>
            <button 
              type="button"
              onClick={() => alert("NWIS Operational Drilling Intelligence - Terms of Service")}
              className="hover:text-slate-600 transition-colors"
            >
              Terms
            </button>
            <span className="text-slate-300">|</span>
            <button 
              type="button"
              onClick={() => alert("NWIS Support: Contact your NWIS Enterprise IT Administrator")}
              className="hover:text-slate-600 transition-colors"
            >
              Help
            </button>
          </div>
        </div>

      </div>

      {/* ============================================================ */}
      {/* FORGOT PASSWORD MODAL (Matching Deep Teal Theme)            */}
      {/* ============================================================ */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <h3 className="font-bold text-[#0F172A] text-lg font-display">
                Account Access & Recovery
              </h3>
              <button 
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="py-4 space-y-3.5 text-sm text-slate-600">
              <p className="leading-relaxed">
                NWIS is an enterprise operational drilling intelligence platform. For security compliance, password resets must be provisioned through your NWIS Enterprise IT administrator or designated Super Administrator.
              </p>
              
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                <p className="font-semibold text-slate-900">Enterprise Support Desk:</p>
                <p><span className="font-medium text-slate-600">Email:</span> support@nwis-enterprise.ai</p>
                <p><span className="font-medium text-slate-600">Desk Code:</span> NWIS-DR-SEC-2847</p>
              </div>
            </div>

            {/* Modal Action Button (Deep Teal #035371 - NOT RED) */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-5 py-2.5 bg-[#035371] text-white rounded-lg text-sm font-semibold hover:bg-[#02435C] active:bg-[#01354A] transition-all focus:outline-none focus:ring-2 focus:ring-[#035371] shadow-sm"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
