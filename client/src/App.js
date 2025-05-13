import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';

// Core components
import Layout from './components/layout/Layout';
import PageLoading from './components/ui/page-loading';

// Lazy loaded components
const Login = lazy(() => import('./pages/auth/Login'));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const UserManagement = lazy(() => import('./pages/users/UserManagement'));
const TrainingManagement = lazy(() => import('./pages/training/TrainingManagement'));
const TrainingAssignments = lazy(() => import('./pages/training/TrainingAssignments'));
const DocumentManagement = lazy(() => import('./pages/documents/DocumentManagement'));
const RiskAssessment = lazy(() => import('./pages/risk/RiskAssessment'));
const IncidentManagement = lazy(() => import('./pages/incidents/IncidentManagement'));
const AuditLogs = lazy(() => import('./pages/audit/AuditLogs'));
const AdvancedReports = lazy(() => import('./pages/reports/AdvancedReports'));

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

// Protected route component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="training">
                  <Route index element={<TrainingManagement />} />
                  <Route path="assignments" element={<TrainingAssignments />} />
                </Route>
                <Route path="documents" element={<DocumentManagement />} />
                <Route path="risk" element={<RiskAssessment />} />
                <Route path="incidents" element={<IncidentManagement />} />
                <Route path="audit" element={<AuditLogs />} />
                <Route path="reports" element={<AdvancedReports />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
