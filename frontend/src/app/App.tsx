import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../shared/components/Layout';
import Dashboard from '../features/dashboard/pages/DashboardPage';
import Settings from '../features/settings/pages/SettingsPage';
import Dictionary from '../features/dictionary/pages/DictionaryPage';
import Quiz from '../features/quiz/pages/QuizPage';
import Auth from '../features/auth/pages/AuthPage';
import useStore from '../store/useStore';
import { useMercure } from '../shared/api/useMercure';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useStore((state) => state.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  useMercure();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Auth mode="login" />} />
        <Route path="/register" element={<Auth mode="register" />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="dictionary" element={<Dictionary />} />
          {/* Legacy routes redirect to unified dictionary page */}
          <Route path="dictionary/add" element={<Navigate to="/dictionary" replace />} />
          <Route path="dictionary/edit" element={<Navigate to="/dictionary" replace />} />
          <Route path="quiz" element={<Quiz />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
