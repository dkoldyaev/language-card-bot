import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Welcome from './pages/Welcome';
import Settings from './pages/Settings';
import DictionaryAdd from './pages/DictionaryAdd';
import DictionaryEdit from './pages/DictionaryEdit';
import Quiz from './pages/Quiz';
import Auth from './pages/Auth';
import useStore from './store/useStore';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useStore((state) => state.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Auth mode="login" />} />
        <Route path="/register" element={<Auth mode="register" />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Welcome />} />
          <Route path="settings" element={<Settings />} />
          <Route path="dictionary/add" element={<DictionaryAdd />} />
          <Route path="dictionary/edit" element={<DictionaryEdit />} />
          <Route path="quiz" element={<Quiz />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
