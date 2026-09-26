import { GoogleOAuthProvider } from '@react-oauth/google'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nProvider } from '../shared/i18n/I18nContext'
import { trackEvent } from '../shared/lib/analytics'
import App from './App.tsx'
import AppThemeProvider from './AppThemeProvider.tsx'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

window.addEventListener('error', (event) => {
  trackEvent('Error', { message: event.message, source: 'window' });
});

window.addEventListener('unhandledrejection', (event) => {
  trackEvent('Error', { message: event.reason?.toString() || 'Unknown rejection', source: 'promise' });
});

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element not found');
}

createRoot(root).render(
  <I18nProvider>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AppThemeProvider>
        <App />
      </AppThemeProvider>
    </GoogleOAuthProvider>
  </I18nProvider>,
)
