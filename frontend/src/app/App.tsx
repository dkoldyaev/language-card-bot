import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Auth from '../features/auth/pages/AuthPage';
import Dashboard from '../features/dashboard/pages/DashboardPage';
import Dictionary from '../features/dictionary/pages/DictionaryPage';
import OnboardingPage from '../features/onboarding/pages/OnboardingPage';
import Presets from '../features/presets/pages/PresetsPage';
import Quiz from '../features/quiz/pages/QuizPage';
import { useMercure } from '../shared/api/useMercure';
import Layout from '../shared/components/Layout';
import { useOfflineSync } from '../shared/hooks/useOfflineSync';

// import useStore from '../store/useStore';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // Allow anonymous guest access to explore the app and play quiz
  return <>{children}</>;
}

// function AdminRoute({ children }: { children: React.ReactNode }) {
//   const token = useStore((state) => state.token);
//   const profile = useStore((state) => state.profile);
//   const isAdmin = Boolean(profile?.isAdmin || profile?.is_admin);

//   if (!token) {
//     return <Navigate to="/" replace />;
//   }
//   if (!isAdmin) {
//     return <Navigate to="/" replace />;
//   }
//   return <>{children}</>;
// }

function App() {
  useMercure();
  useOfflineSync();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Auth />} />
        <Route path="/register" element={<Auth />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="settings" element={<Navigate to="/" replace />} />
          <Route path="dictionary" element={<Dictionary />} />
          {/* Legacy routes redirect to unified dictionary page */}
          <Route path="dictionary/add" element={<Navigate to="/dictionary" replace />} />
          <Route path="dictionary/edit" element={<Navigate to="/dictionary" replace />} />
          <Route path="quiz" element={<Quiz />} />
          <Route
            path="presets"
            element={<Presets />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
