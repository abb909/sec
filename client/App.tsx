// Import immediate suppression FIRST - JavaScript execution
import "./immediate-suppression.js";
// Import warning suppression FIRST before anything else
import "./suppress-warnings";
import "./global.css";

import React, { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { DataProvider } from "@/contexts/DataContext";
import { Layout } from "@/components/Layout";
import { LoginForm } from "@/components/LoginForm";
import { UserSetupDialog } from "@/components/UserSetupDialog";
import { UserSetupCheck } from "@/components/UserSetupCheck";
import ErrorBoundary from "@/components/ErrorBoundary";
import { FirebaseStatus } from "@/components/FirebaseStatus";
import { NetworkStatus } from "@/components/NetworkStatus";
import { FirebaseErrorBoundary } from "@/components/FirebaseErrorBoundary";
import { FirebaseConnectionMonitor } from "@/components/FirebaseConnectionMonitor";
import { CriticalErrorRecovery } from "@/components/CriticalErrorRecovery";
import { FloatingEmergencyButton } from "@/components/FloatingEmergencyButton";
import { suppressWarnings } from "@/utils/warningSuppressionUtils";

// Apply warning suppression immediately at module load
suppressWarnings();

// Development-only: Completely override React warnings if they persist
if (import.meta.env.DEV) {
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    // Convert first argument to string for pattern matching
    const message = String(args[0] || '');

    // Aggressively suppress ALL React defaultProps warnings
    if (message.includes('defaultProps') ||
        message.includes('Support for defaultProps will be removed') ||
        message.includes('Use JavaScript default parameters instead')) {
      return; // Completely suppress
    }

    // Suppress any warning that mentions XAxis or YAxis components
    const argsAsString = args.join(' ');
    if (argsAsString.includes('XAxis') || argsAsString.includes('YAxis')) {
      return; // Completely suppress
    }

    // Suppress warnings with %s placeholders that are typically React component warnings
    if (message.includes('%s') && (
        argsAsString.includes('XAxis') ||
        argsAsString.includes('YAxis') ||
        argsAsString.includes('Axis') ||
        message.includes('function components')
    )) {
      return; // Suppress these formatted warnings
    }

    originalWarn.apply(console, args);
  };
}

import Dashboard from "./pages/Dashboard";
import Workers from "./pages/Workers";
import WorkersRedesigned from "./pages/WorkersRedesigned";
import Rooms from "./pages/Rooms";
import Fermes from "./pages/Fermes";
import Stock from "./pages/Stock";
import Statistics from "./pages/Statistics";
import AdminTools from "./pages/AdminTools";
import SuperAdminSetup from "./pages/SuperAdminSetup";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const [showSetup, setShowSetup] = useState(false);
  const [showFirebaseStatus, setShowFirebaseStatus] = useState(false);

  useEffect(() => {
    // Show setup dialog if user is authenticated but profile is incomplete
    if (isAuthenticated && user) {
      const isIncomplete = !user.nom || user.nom === 'Utilisateur' || !user.telephone;
      setShowSetup(isIncomplete);
    }
  }, [isAuthenticated, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <LoginForm />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <UserSetupCheck>
        <Layout>
          {showFirebaseStatus && (
            <div className="mb-4">
              <FirebaseStatus onRetry={() => setShowFirebaseStatus(false)} />
            </div>
          )}
          {children}
          <UserSetupDialog
            open={showSetup}
            onClose={() => setShowSetup(false)}
          />
        </Layout>
      </UserSetupCheck>
    </ErrorBoundary>
  );
};

const ProtectedRouteWithoutLayout = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    // Show setup dialog if user is authenticated but profile is incomplete
    if (isAuthenticated && user) {
      const isIncomplete = !user.nom || user.nom === 'Utilisateur' || !user.telephone;
      setShowSetup(isIncomplete);
    }
  }, [isAuthenticated, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <LoginForm />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      {children}
      <UserSetupDialog
        open={showSetup}
        onClose={() => setShowSetup(false)}
      />
    </ErrorBoundary>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/fermes" element={
        <ProtectedRoute>
          <Fermes />
        </ProtectedRoute>
      } />
      <Route path="/ouvriers" element={
        <ProtectedRoute>
          <Workers />
        </ProtectedRoute>
      } />
      <Route path="/workers" element={
        <ProtectedRoute>
          <Workers />
        </ProtectedRoute>
      } />
      <Route path="/ouvriers" element={
        <ProtectedRoute>
          <WorkersRedesigned />
        </ProtectedRoute>
      } />
      <Route path="/workers/:id" element={
        <ProtectedRoute>
          <Workers />
        </ProtectedRoute>
      } />
      <Route path="/ouvriers/:id" element={
        <ProtectedRoute>
          <Workers />
        </ProtectedRoute>
      } />
      <Route path="/chambres" element={
        <ProtectedRoute>
          <Rooms />
        </ProtectedRoute>
      } />
      <Route path="/stock" element={
        <ProtectedRoute>
          <Stock />
        </ProtectedRoute>
      } />
      <Route path="/statistiques" element={
        <ProtectedRoute>
          <Statistics />
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminTools />
        </ProtectedRoute>
      } />
      <Route path="/admin-tools" element={
        <ProtectedRoute>
          <AdminTools />
        </ProtectedRoute>
      } />
      <Route path="/super-admin-setup" element={<SuperAdminSetup />} />
      <Route path="/settings" element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      } />
      <Route path="/parametres" element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  const [criticalError, setCriticalError] = useState<string | null>(null);

  // Apply global warning suppression for Recharts
  useEffect(() => {
    const cleanup = suppressWarnings();
    return cleanup;
  }, []);

  // Listen for critical Firebase errors and auto-detect
  useEffect(() => {
    const handleCriticalError = (event: any) => {
      if (event.detail?.error?.includes('Failed to fetch') ||
          event.detail?.error?.includes('TypeError: Failed to fetch')) {
        setCriticalError('Connexion Firebase critique interrompue. Récupération nécessaire.');
      }
    };

    // Immediate network test on app load
    const testConnectivity = async () => {
      try {
        // Try a simple fetch to detect network issues early
        await fetch('https://www.google.com/favicon.ico', {
          mode: 'no-cors',
          cache: 'no-store',
          signal: AbortSignal.timeout(3000)
        });
      } catch (error) {
        console.error('Network connectivity test failed:', error);
        setCriticalError('Problème de connectivité réseau détecté. Récupération recommandée.');
      }
    };

    // Auto-detect common Firebase fetch errors from console
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('Failed to fetch') && message.includes('firebase')) {
        setCriticalError('Erreur Firebase critique détectée. Récupération nécessaire.');
      }
      originalConsoleError.apply(console, args);
    };

    testConnectivity();
    window.addEventListener('firebase-critical-error', handleCriticalError);

    return () => {
      window.removeEventListener('firebase-critical-error', handleCriticalError);
      console.error = originalConsoleError;
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <NetworkStatus />
          <FirebaseConnectionMonitor />
          {criticalError && (
            <CriticalErrorRecovery
              error={criticalError}
              onRetry={() => setCriticalError(null)}
            />
          )}
          <FloatingEmergencyButton />
          <FirebaseErrorBoundary>
            <AuthProvider>
              <NotificationProvider>
                <DataProvider>
                  <BrowserRouter>
                    <AppRoutes />
                  </BrowserRouter>
                </DataProvider>
              </NotificationProvider>
            </AuthProvider>
          </FirebaseErrorBoundary>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

createRoot(document.getElementById("root")!).render(<App />);
