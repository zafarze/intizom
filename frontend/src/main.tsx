/// <reference types="vite-plugin-pwa/client" />
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import i18n from './i18n';
import App from './App.tsx';

// Register service worker and handle auto-update
const updateSW = registerSW({
  onNeedRefresh() {
    // Automatically refresh the page when a new version is available
    if (confirm(i18n.t('common.update_app_confirm'))) {
      updateSW(true);
    }
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