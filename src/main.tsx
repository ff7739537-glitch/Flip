import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';
import { registerServiceWorker } from '@/lib/pwa';

registerServiceWorker();

// Global error handlers — catch anything that escapes React
window.addEventListener('unhandledrejection', (event) => {
  console.error('[FLIP] Unhandled promise rejection:', event.reason);
});

window.addEventListener('error', (event) => {
  console.error('[FLIP] Uncaught error:', event.error || event.message);
});

const rootEl = document.getElementById('root');
if (!rootEl) {
  document.body.innerHTML =
    '<div style="display:flex;min-height:100vh;align-items:center;justify-content:center;background:#020617;color:#f1f5f9;font-family:system-ui;padding:1rem;">' +
    '<div style="text-align:center;max-width:400px;">' +
    '<h1 style="font-size:2rem;font-weight:900;letter-spacing:-0.05em;margin-bottom:0.5rem;">FLIP</h1>' +
    '<p style="color:#94a3b8;font-size:0.875rem;">The app could not start. Please refresh the page.</p>' +
    '<button onclick="location.reload()" style="margin-top:1rem;background:#10b981;color:white;border:none;padding:0.625rem 1.5rem;border-radius:0.75rem;font-weight:600;cursor:pointer;">Reload</button>' +
    '</div></div>';
} else {
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary fallbackLabel="FLIP encountered an error">
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
}
