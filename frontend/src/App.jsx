// App root — sets up React Router with protected routes and the authenticated layout
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Home from './pages/Home';
import Tasks from './pages/Tasks';
import DSATracker from './pages/DSATracker';
import Projects from './pages/Projects';
import InternshipCRM from './pages/InternshipCRM';
import ContentCalendar from './pages/ContentCalendar';
import Goals from './pages/Goals';
import GeminiChat from './pages/GeminiChat';
import Settings from './pages/Settings';

function AppLoader() {
  return (
    <div style={{ height: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222831' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 36, height: 36, border: '3px solid #393E46', borderTopColor: '#00ADB5', borderRadius: '50%', animation: 'appSpin 0.8s linear infinite' }} />
        <div style={{ color: '#8a8f96', fontSize: 13, fontFamily: 'Geist Mono, monospace', letterSpacing: 0.4 }}>
          Personal OS
        </div>
      </div>
      <style>{`@keyframes appSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Brief init window — ensures auth state is read before first paint
    setReady(true);
  }, []);

  if (!ready) return <AppLoader />;

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected — all share the sidebar layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/"           element={<Home />} />
              <Route path="/tasks"      element={<Tasks />} />
              <Route path="/dsa"        element={<DSATracker />} />
              <Route path="/projects"   element={<Projects />} />
              <Route path="/internship" element={<InternshipCRM />} />
              <Route path="/content"    element={<ContentCalendar />} />
              <Route path="/goals"      element={<Goals />} />
              <Route path="/chat"       element={<GeminiChat />} />
              <Route path="/settings"   element={<Settings />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
