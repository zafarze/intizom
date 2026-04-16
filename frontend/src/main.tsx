/// <reference types="vite-plugin-pwa/client" />
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App.tsx';
import UpdatePrompt from './components/UpdatePrompt.tsx';

const updateSW = registerSW({
  onNeedRefresh() {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const destroy = () => { root.unmount(); document.body.removeChild(container); };
    root.render(
      <UpdatePrompt
        onUpdate={() => { destroy(); updateSW(true); }}
        onDismiss={destroy}
      />
    );
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
