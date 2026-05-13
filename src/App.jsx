import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ChatPage from './pages/ChatPage';
import AboutPage from './pages/AboutPage';
import AdminPage from './pages/AdminPage';
import SourcesPage from './pages/SourcesPage';
import EducatorsPage from './pages/EducatorsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/sources" element={<SourcesPage />} />
        <Route path="/educators" element={<EducatorsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        {/* Legacy route */}
        <Route path="/prompt" element={<AboutPage />} />
      </Routes>
    </BrowserRouter>
  );
}
