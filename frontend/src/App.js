import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import Layout from './components/Layout';
import DashboardOverview from './components/dashboard/DashboardOverview';
import AgentRegistry from './components/agents/AgentRegistry';
import WorkflowView from './components/workflows/WorkflowView';
import RunsList from './components/runs/RunsList';
import RunDetail from './components/runs/RunDetail';
import PolicyEngine from './components/governance/PolicyEngine';
import HITLQueue from './components/governance/HITLQueue';
import CostDashboard from './components/costs/CostDashboard';
import IntegrationsView from './components/integrations/IntegrationsView';
import OnboardingWizard from './components/onboarding/OnboardingWizard';
import QuickstartPage from './components/onboarding/QuickstartPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen font-body text-slate-500">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen font-body text-slate-500">Loading...</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardOverview />} />
        <Route path="agents" element={<AgentRegistry />} />
        <Route path="workflows" element={<WorkflowView />} />
        <Route path="runs" element={<RunsList />} />
        <Route path="runs/:runId" element={<RunDetail />} />
        <Route path="policies" element={<PolicyEngine />} />
        <Route path="hitl" element={<HITLQueue />} />
        <Route path="costs" element={<CostDashboard />} />
        <Route path="integrations" element={<IntegrationsView />} />
        <Route path="quickstart" element={<QuickstartPage />} />
        <Route path="onboarding" element={<OnboardingWizard />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
