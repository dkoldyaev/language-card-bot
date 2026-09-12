import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../shared/components/Layout';
import Dashboard from '../features/dashboard/pages/DashboardPage';
import Dictionary from '../features/dictionary/pages/DictionaryPage';
import Quiz from '../features/quiz/pages/QuizPage';
import Auth from '../features/auth/pages/AuthPage';
import Presets from '../features/presets/pages/PresetsPage';
import useStore from '../store/useStore';
import { useMercure } from '../shared/api/useMercure';
import { useOfflineSync } from '../shared/hooks/useOfflineSync';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useStore((state) => state.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const token = useStore((state) => state.token);
  const profile = useStore((state) => state.profile);
  const isAdmin = Boolean(profile?.isAdmin || profile?.is_admin);

  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function App() {
  useMercure();
  useOfflineSync();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Auth />} />
        <Route path="/register" element={<Auth />} />
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
            element={
              <AdminRoute>
                <Presets />
              </AdminRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
