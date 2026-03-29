import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import UploadPage from './pages/UploadPage';
import ResultsPage from './pages/ResultsPage';
import ConfirmPage from './pages/ConfirmPage';
import ActionPage from './pages/ActionPage';
import HistoryPage from './pages/HistoryPage';

const Placeholder = ({ text }) => (
  <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1a1a' }}>
    <p className="text-white text-xl font-semibold">{text}</p>
  </div>
);

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/confirm" element={<ConfirmPage />} />
        <Route path="/actions" element={<ActionPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </>
  );
}
