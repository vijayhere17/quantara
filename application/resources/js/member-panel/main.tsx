import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '../../css/member-panel.css';

const rootEl = document.getElementById('member-panel-root');

if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
