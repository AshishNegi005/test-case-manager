import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/common/Layout';
import LoadingSpinner from './components/common/LoadingSpinner';

// Lazy loaded pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const TestCases = lazy(() => import('./pages/TestCases'));
const TestCaseDetail = lazy(() => import('./pages/TestCaseDetail'));
const TestSuites = lazy(() => import('./pages/TestSuites'));
const Executions = lazy(() => import('./pages/Executions'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Users = lazy(() => import('./pages/Users'));
const CiCd = lazy(() => import('./pages/CiCd'));
const Schedules = lazy(() => import('./pages/Schedules'));

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

const AppRoutes = () => (
  <Suspense fallback={<LoadingSpinner />}>
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="projects/:id/testcases" element={<TestCases />} />
        <Route path="projects/:id/testcases/:caseId" element={<TestCaseDetail />} />
        <Route path="projects/:id/suites" element={<TestSuites />} />
        <Route path="projects/:id/executions" element={<Executions />} />
        <Route path="projects/:id/analytics" element={<Analytics />} />
        <Route path="projects/:id/cicd" element={<CiCd />} />
        <Route path="projects/:id/schedules" element={<Schedules />} />
        <Route path="users" element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </Suspense>
);

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ProjectProvider>
            <AppRoutes />
          </ProjectProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
