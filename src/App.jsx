import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ChatPage from './pages/ChatPage';
import AboutPage from './pages/AboutPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/about" element={<AboutPage />} />
        {/* Legacy route */}
        <Route path="/prompt" element={<AboutPage />} />
      </Routes>
    </BrowserRouter>
  );
}
