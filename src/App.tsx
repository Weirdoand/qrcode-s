import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import CreateCode from './pages/CreateCode';
import EditCode from './pages/EditCode';
import LivePage from './pages/LivePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/dashboard/new" element={<CreateCode />} />
      <Route path="/dashboard/:id" element={<EditCode />} />
      <Route path="/c/:slug" element={<LivePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

