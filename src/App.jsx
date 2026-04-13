import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ChatPage from './pages/ChatPage';
import PromptPage from './pages/PromptPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/prompt" element={<PromptPage />} />
      </Routes>
    </BrowserRouter>
  );
}
