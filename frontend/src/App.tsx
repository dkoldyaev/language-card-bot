import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Welcome from './pages/Welcome';
import Settings from './pages/Settings';
import DictionaryAdd from './pages/DictionaryAdd';
import DictionaryEdit from './pages/DictionaryEdit';
import Quiz from './pages/Quiz';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/dictionary/add" element={<DictionaryAdd />} />
        <Route path="/dictionary/edit" element={<DictionaryEdit />} />
        <Route path="/quiz" element={<Quiz />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
