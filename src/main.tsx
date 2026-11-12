import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/fonts.css';
import './styles/global.css';
import App from './App';
import { useBundleStore } from './store/bundleStore';

// Restore an explicitly saved system before first render. Never writes to
// storage, so seeded defaults cannot overwrite a saved configuration.
useBundleStore.getState().hydrateFromStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
