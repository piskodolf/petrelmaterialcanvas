import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import FlowCanvas from './components/FlowCanvas';
import { MaterialProvider } from './contexts/MaterialContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { AdminPanel } from './components/AdminPanel';
import { PendingScreen } from './components/PendingScreen';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)' }}>Nalaganje...</div>;
  if (!user) return <Navigate to="/login" />;
  
  if (profile && profile.status === 'pending' && location.pathname !== '/pending') {
    return <Navigate to="/pending" />;
  }
  
  if (profile && profile.status === 'approved' && location.pathname === '/pending') {
    return <Navigate to="/" />;
  }
  
  if (profile && profile.role !== 'admin' && location.pathname === '/admin') {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/admin" element={<PrivateRoute><AdminPanel /></PrivateRoute>} />
      <Route path="/pending" element={<PrivateRoute><PendingScreen /></PrivateRoute>} />
      <Route path="/flow/:flowId" element={
        <PrivateRoute>
          <MaterialProvider>
            <ReactFlowProvider>
              <FlowCanvas />
            </ReactFlowProvider>
          </MaterialProvider>
        </PrivateRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

