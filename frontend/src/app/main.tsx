import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import '../index.css'
import App from './App.tsx'
import theme from './theme'

import { GoogleOAuthProvider } from '@react-oauth/google'
import { trackEvent } from '../shared/lib/analytics'
import { I18nProvider } from '../shared/i18n/I18nContext'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

window.addEventListener('error', (event) => {
  trackEvent('Error', { message: event.message, source: 'window' });
});

window.addEventListener('unhandledrejection', (event) => {
  trackEvent('Error', { message: event.reason?.toString() || 'Unknown rejection', source: 'promise' });
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID || 'dummy-client-id'}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </GoogleOAuthProvider>
    </I18nProvider>
  </StrictMode>,
)
