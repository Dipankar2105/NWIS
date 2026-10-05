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
  CheckCircle2,
  X
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
    lastUpdated: '29 Sept 2026, 10:42 AM'
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
    <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen w-full bg-[#070D18] overflow-x-hidden lg:overflow-hidden">
      {/* ============================================================ */}
      {/* LEFT PANEL: Brand, Geospatial Visualization & Capabilities   */}
      {/* ============================================================ */}
      <div className="relative w-full lg:w-[60%] xl:w-[65%] 2xl:w-[66.4%] h-52 sm:h-72 md:h-96 lg:h-screen bg-[#070D18] flex flex-col justify-between overflow-hidden select-none flex-shrink-0">
        {/* Full Visual Background (Drilling Rig & Geospatial Map from Approved Design) */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
          style={{ backgroundImage: "url('/assets/login-hero-bg.png')" }}
        />
        <span className="sr-only">NWIS — Nearby Wells Intelligence System — AI-Powered Offset Well Knowledge and Decision Support Platform</span>
      </div>

      {/* ============================================================ */}
      {/* RIGHT PANEL: Secure Access & Authentication                  */}
      {/* ============================================================ */}
      <div className="w-full lg:w-[40%] xl:w-[35%] 2xl:w-[33.6%] h-full lg:h-screen bg-[#F8FAFC] flex flex-col justify-between p-4 sm:p-6 lg:p-8 xl:p-10 relative z-10 border-t lg:border-t-0 lg:border-l border-slate-200/80 shadow-2xl lg:shadow-none overflow-y-auto lg:overflow-hidden">
        
        {/* Top Spacer */}
        <div className="hidden lg:block h-1" />

        {/* Main Authentication Box */}
        <div className="w-full max-w-[400px] mx-auto my-auto py-2 lg:py-4">
          
          {/* Approved NWIS Logo */}
          <div className="mb-6">
            <img 
              src="/assets/nwis-logo-dark.png" 
              alt="NWIS - Nearby Wells Intelligence System" 
              className="h-9 w-auto object-contain"
            />
          </div>

          {/* Heading */}
          <div className="mb-5 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-extrabold text-[#0F172A] tracking-tight font-display">
              Welcome back
            </h1>
            <p className="text-slate-500 font-normal text-xs sm:text-sm mt-1">
              Sign in to access NWIS.
            </p>
          </div>

          {/* Session Expired Notice */}
          {sessionExpiredMessage && (
            <div className="mb-6 p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-amber-800 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>{sessionExpiredMessage}</span>
            </div>
          )}

          {/* Inline Error Notice */}
          {errorMessage && (
            <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-red-800 text-xs animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-900">Unable to sign in</p>
                <p className="text-red-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            
            {/* Work Email Field */}
            <div>
              <label 
                htmlFor="work-email" 
                className="block text-sm font-semibold text-slate-800 mb-1.5"
              >
                Work email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
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
                  placeholder="Enter your work email"
                  className={`block w-full pl-10 pr-3.5 py-3 border text-slate-900 text-sm rounded-lg bg-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.email 
                      ? 'border-red-400 focus:ring-red-400 focus:border-red-400' 
                      : 'border-slate-200 focus:ring-red-600/20 focus:border-red-600'
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
                  className="block text-sm font-semibold text-slate-800"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs sm:text-sm font-semibold text-[#B91C1C] hover:text-[#991B1B] hover:underline focus:outline-none transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
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
                  placeholder="Enter your password"
                  className={`block w-full pl-10 pr-11 py-3 border text-slate-900 text-sm rounded-lg bg-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.password 
                      ? 'border-red-400 focus:ring-red-400 focus:border-red-400' 
                      : 'border-slate-200 focus:ring-red-600/20 focus:border-red-600'
                  } disabled:bg-slate-50 disabled:text-slate-500`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-red-600 text-xs mt-1 font-medium">{fieldErrors.password}</p>
              )}
            </div>

            {/* Remember This Device Checkbox */}
            <div className="flex items-center pt-0.5">
              <input
                id="remember-device"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#B91C1C] focus:ring-red-500 focus:ring-offset-0 cursor-pointer accent-[#B91C1C]"
              />
              <label 
                htmlFor="remember-device" 
                className="ml-2.5 block text-xs sm:text-sm text-slate-700 font-medium cursor-pointer select-none"
              >
                Remember this device
              </label>
            </div>

            {/* Primary Sign In Button */}
            <button
              type="submit"
              id="sign-in-btn"
              disabled={isSubmitting}
              className="w-full h-12 flex items-center justify-center gap-2 px-5 py-3 border border-transparent rounded-lg text-white font-semibold text-sm sm:text-base bg-[#B91C1C] hover:bg-[#991B1B] active:bg-[#7F1D1D] disabled:bg-red-800/60 disabled:cursor-not-allowed shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
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

          {/* Authorized Access Only Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#F8FAFC] px-3 text-slate-400 font-medium">
                Authorized access only
              </span>
            </div>
          </div>

          {/* SYSTEM STATUS Card (Exact from Design) */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-800">
                <ShieldCheck className="w-4 h-4 text-slate-700" />
                <span className="text-[11px] font-bold tracking-wider uppercase">
                  SYSTEM STATUS
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Last updated: {systemHealth.lastUpdated}
              </span>
            </div>

            {/* Status Rows */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
                  <span className="text-slate-700 font-medium">NWIS Services</span>
                </div>
                <span className="text-emerald-600 font-semibold">{systemHealth.nwis}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
                  <span className="text-slate-700 font-medium">Knowledge Base</span>
                </div>
                <span className="text-emerald-600 font-semibold">{systemHealth.knowledge}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
                  <span className="text-slate-700 font-medium">GIS Services</span>
                </div>
                <span className="text-emerald-600 font-semibold">{systemHealth.gis}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Footer Links */}
        <div className="text-center pt-4 pb-2">
          <div className="flex justify-center items-center gap-3 text-xs text-slate-400">
            <button 
              type="button"
              onClick={() => alert("NWIS Enterprise Platform - Privacy and Data Governance Policy")}
              className="hover:text-slate-600 transition-colors"
            >
              Privacy
            </button>
            <span>|</span>
            <button 
              type="button"
              onClick={() => alert("NWIS Operational Drilling Intelligence - Terms of Service")}
              className="hover:text-slate-600 transition-colors"
            >
              Terms
            </button>
            <span>|</span>
            <button 
              type="button"
              onClick={() => alert("NWIS Drilling Support: Contact your NWIS Enterprise IT Administrator")}
              className="hover:text-slate-600 transition-colors"
            >
              Help
            </button>
          </div>
        </div>

      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg font-display">Account Access & Recovery</h3>
              <button 
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="py-4 space-y-3 text-sm text-slate-600">
              <p>
                NWIS is an enterprise operational drilling intelligence platform. For security compliance, password resets must be provisioned through your NWIS Enterprise IT administrator or designated Super Administrator.
              </p>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-700">
                <p className="font-semibold text-slate-800">Support Desk:</p>
                <p>Email: support@nwis-enterprise.ai</p>
                <p>Desk: NWIS-DR-SEC-2847</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-4 py-2 bg-[#B91C1C] text-white rounded-lg text-sm font-semibold hover:bg-[#991B1B]"
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
