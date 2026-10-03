import type React from 'react';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useMercure } from '../shared/api/useMercure';
import Layout from '../shared/components/Layout';
import NavigationTracker from '../shared/components/NavigationTracker';
import { useOfflineSync } from '../shared/hooks/useOfflineSync';
import useStore from '../store/useStore';

const Auth = lazy(() => import('../features/auth/pages/AuthPage'));
const Dashboard = lazy(() => import('../features/dashboard/pages/DashboardPage'));
const Dictionary = lazy(() => import('../features/dictionary/pages/DictionaryPage'));
const EditDictionary = lazy(() => import('../features/dictionary/pages/EditDictionaryPage'));
const OnboardingPage = lazy(() => import('../features/onboarding/pages/OnboardingPage'));
const Presets = lazy(() => import('../features/presets/pages/PresetsPage'));
const Quiz = lazy(() => import('../features/quiz/pages/QuizPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // Allow anonymous guest access to explore the app and play quiz
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const token = useStore((state) => state.token);
  const profile = useStore((state) => state.profile);
  const isAdmin = Boolean(profile?.isAdmin || profile?.is_admin);

  if (!token) {
    return <Navigate to="/" replace />;
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function RootRedirect() {
  const baseLanguage = useStore((state) => state.settings?.baseLanguage) || 'en';
  return <Navigate to={`/${baseLanguage.toLowerCase()}`} replace />;
}

function App() {
  useMercure();
  useOfflineSync();

  return (
    <BrowserRouter>
      <NavigationTracker />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          
          <Route path="/" element={<RootRedirect />} />
          
          <Route path="/:locale" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="settings" element={<Navigate to="." replace />} />
            
            <Route path="dictionary">
              <Route index element={<Dictionary />} />
              <Route path="new" element={<Dictionary />} />
              <Route path=":dictId" element={<Dictionary />} />
              <Route path=":dictId/edit" element={<EditDictionary />} />
            </Route>

            <Route path="quiz" element={<Quiz />} />
            <Route
              path="presets"
              element={<AdminRoute><Presets /></AdminRoute>}
            />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
