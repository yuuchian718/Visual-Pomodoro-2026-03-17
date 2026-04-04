import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {AuthGate} from './components/AuthGate.tsx';
import './index.css';

const isLocalhost =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

if ('serviceWorker' in navigator && !isLocalhost) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
} else if ('serviceWorker' in navigator && isLocalhost) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.unregister();
      });
    }).catch(() => {
      // Keep localhost dev usable even if the browser rejects SW inspection.
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate>
      {({accessState, saveLicenseToken, clearLicenseToken, refreshAccess, activateCommercialLicenseKey}) => (
        <App
          accessState={accessState}
          onSaveLicenseToken={saveLicenseToken}
          onClearLicenseToken={clearLicenseToken}
          onRefreshAccess={refreshAccess}
          onActivateCommercialLicenseKey={activateCommercialLicenseKey}
        />
      )}
    </AuthGate>
  </StrictMode>,
);
