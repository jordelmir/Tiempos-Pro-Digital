import React, { useEffect, PropsWithChildren } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import AuditView from './components/AuditView';
import LedgerView from './components/LedgerView';
import { useAuthStore } from './store/useAuthStore';
import { ROUTES } from './constants';
import { MatrixBackground } from './components/MatrixBackground';

function ProtectedRoute({ children }: PropsWithChildren) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center relative overflow-hidden z-10">
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 border-4 border-cyber-neon border-t-transparent rounded-full animate-spin mb-6 mx-auto shadow-[0_0_20px_#00f0ff]"></div>
          <h2 className="text-3xl font-display font-bold text-white tracking-widest animate-pulse drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
            CARGANDO NÚCLEO
          </h2>
          <p className="text-cyber-neon font-mono text-sm mt-2 text-glow">
            INICIALIZANDO ARQUITECTURA PHRONT...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <Layout>{children}</Layout>;
}

export default function App() {
  const fetchUser = useAuthStore((state) => state.fetchUser);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <>
      <MatrixBackground />
      <HashRouter>
        <Routes>
          <Route path={ROUTES.LOGIN} element={<Login />} />

          <Route
            path={ROUTES.DASHBOARD}
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.AUDIT}
            element={
              <ProtectedRoute>
                <AuditView />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.LEDGER}
            element={
              <ProtectedRoute>
                <LedgerView />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        </Routes>
      </HashRouter>
    </>
  );
}
