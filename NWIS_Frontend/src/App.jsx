import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import './components/shared.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NearbyWells from './pages/NearbyWells';
import WellDetails from './pages/WellDetails';
import Events from './pages/Events';
import KnowledgeRepository from './pages/KnowledgeRepository';
import AIChat from './pages/AIChat';
import AIEvidence from './pages/AIEvidence';
import RiskAssessment from './pages/RiskAssessment';
import OffsetWellComparison from './pages/OffsetWellComparison';
import Alerts from './pages/Alerts';
import CrossWellCorrelation from './pages/CrossWellCorrelation';
import DocumentManagement from './pages/DocumentManagement';
import OperationsAnalytics from './pages/OperationsAnalytics';
import UserProfile from './pages/UserProfile';
import SystemSettings from './pages/SystemSettings';
import ActivityLog from './pages/ActivityLog';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppProvider>
          <Router>
          <Routes>
            {/* Public Route: Screen 1 - Login */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />

            {/* Screen 2: Main Dashboard / Command Center */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Screen 3: Nearby Wells & Geospatial Intelligence */}
            <Route
              path="/nearby-wells"
              element={
                <ProtectedRoute>
                  <NearbyWells />
                </ProtectedRoute>
              }
            />
            <Route
              path="/nearby"
              element={
                <ProtectedRoute>
                  <NearbyWells />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wells/map"
              element={
                <ProtectedRoute>
                  <NearbyWells />
                </ProtectedRoute>
              }
            />

            {/* Screen 4: Well Details & Well Intelligence */}
            <Route
              path="/wells"
              element={
                <ProtectedRoute>
                  <WellDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wells/:wellId"
              element={
                <ProtectedRoute>
                  <WellDetails />
                </ProtectedRoute>
              }
            />

            {/* Screen 5: Offset Well Comparison */}
            <Route
              path="/comparison"
              element={
                <ProtectedRoute>
                  <OffsetWellComparison />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wells/compare"
              element={
                <ProtectedRoute>
                  <OffsetWellComparison />
                </ProtectedRoute>
              }
            />
            <Route
              path="/offset-well-comparison"
              element={
                <ProtectedRoute>
                  <OffsetWellComparison />
                </ProtectedRoute>
              }
            />

            {/* Screen 6: Drilling Events & Historical Experience */}
            <Route
              path="/events"
              element={
                <ProtectedRoute>
                  <Events />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/:id"
              element={
                <ProtectedRoute>
                  <Events />
                </ProtectedRoute>
              }
            />
            <Route
              path="/risk/events"
              element={
                <ProtectedRoute>
                  <Events />
                </ProtectedRoute>
              }
            />

            {/* Screen 7: Documents & Knowledge Repository */}
            <Route
              path="/knowledge"
              element={
                <ProtectedRoute>
                  <KnowledgeRepository />
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedRoute>
                  <KnowledgeRepository />
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents/:id"
              element={
                <ProtectedRoute>
                  <KnowledgeRepository />
                </ProtectedRoute>
              }
            />

            {/* Screen 8/9: Drilling Intelligence Assistant / AI Chat */}
            <Route
              path="/ai"
              element={
                <ProtectedRoute>
                  <AIChat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-search"
              element={
                <ProtectedRoute>
                  <AIChat />
                </ProtectedRoute>
              }
            />

            {/* Risk Analysis & Hazard Prediction */}
            <Route
              path="/risk"
              element={
                <ProtectedRoute>
                  <RiskAssessment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/risk-assessment"
              element={
                <ProtectedRoute>
                  <RiskAssessment />
                </ProtectedRoute>
              }
            />

            {/* Proactive Alerts & Alert Details */}
            <Route
              path="/alerts"
              element={
                <ProtectedRoute>
                  <Alerts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alerts/:alertId"
              element={
                <ProtectedRoute>
                  <Alerts />
                </ProtectedRoute>
              }
            />

            {/* Screen 10: Cross-Well Formation Correlation */}
            <Route
              path="/cross-well-correlation"
              element={
                <ProtectedRoute>
                  <CrossWellCorrelation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/correlation"
              element={
                <ProtectedRoute>
                  <CrossWellCorrelation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics/correlation"
              element={
                <ProtectedRoute>
                  <CrossWellCorrelation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics/cross-well-correlation"
              element={
                <ProtectedRoute>
                  <CrossWellCorrelation />
                </ProtectedRoute>
              }
            />

            {/* Screen 11: Operations Analytics & Management View */}
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <OperationsAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics/management"
              element={
                <ProtectedRoute>
                  <OperationsAnalytics />
                </ProtectedRoute>
              }
            />

            {/* Screen 12: Document Management & Upload Processing */}
            <Route
              path="/upload-processing"
              element={
                <ProtectedRoute>
                  <DocumentManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <DocumentManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents/upload"
              element={
                <ProtectedRoute>
                  <DocumentManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/document-management"
              element={
                <ProtectedRoute>
                  <DocumentManagement />
                </ProtectedRoute>
              }
            />

            {/* Screen 13: AI Evidence Detail */}
            <Route
              path="/ai/evidence"
              element={
                <ProtectedRoute>
                  <AIEvidence />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai/evidence/:id"
              element={
                <ProtectedRoute>
                  <AIEvidence />
                </ProtectedRoute>
              }
            />
            <Route
              path="/evidence/:id"
              element={
                <ProtectedRoute>
                  <AIEvidence />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-answer"
              element={
                <ProtectedRoute>
                  <AIEvidence />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-evidence"
              element={
                <ProtectedRoute>
                  <AIEvidence />
                </ProtectedRoute>
              }
            />

            {/* Screen 14: User Profile & Role Management */}
            <Route
              path="/settings/profile"
              element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              }
            />

            {/* Screen 15: System Settings & Configuration */}
            <Route
              path="/settings/system"
              element={
                <ProtectedRoute>
                  <SystemSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SystemSettings />
                </ProtectedRoute>
              }
            />

            {/* Screen 16: Activity & Audit Log */}
            <Route
              path="/settings/activity-log"
              element={
                <ProtectedRoute>
                  <ActivityLog />
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit"
              element={
                <ProtectedRoute>
                  <ActivityLog />
                </ProtectedRoute>
              }
            />
            <Route
              path="/activity-log"
              element={
                <ProtectedRoute>
                  <ActivityLog />
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit-log"
              element={
                <ProtectedRoute>
                  <ActivityLog />
                </ProtectedRoute>
              }
            />

            {/* Root Redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          </Router>
        </AppProvider>
      </ToastProvider>
    </AuthProvider>
  );
}