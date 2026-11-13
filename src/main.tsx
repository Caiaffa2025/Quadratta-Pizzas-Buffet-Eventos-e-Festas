import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const mountEl = document.getElementById('admin-root') || document.getElementById('root');
if (mountEl) {
  createRoot(mountEl).render(<App />);
}
