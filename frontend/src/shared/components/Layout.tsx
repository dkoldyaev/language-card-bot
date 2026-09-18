import { Alert, Box, Button, Typography, alpha, useMediaQuery, useTheme } from '@mui/material';
import { useEffect } from 'react';
import { Link as RouterLink, Outlet } from 'react-router-dom';
import { GuidelineController } from '../../features/guideline';
import useStore from '../../store/useStore';
import apiClient from '../api/client';
import { useTranslation } from '../i18n/I18nContext';
import DictionarySelector from './DictionarySelector';
import LocaleSwitcher from './LocaleSwitcher';
import Sidebar from './Sidebar';
import ThemeSwitcher from './ThemeSwitcher';

export default function Layout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { t } = useTranslation();
  const token = useStore((state) => state.token);
  const setDictionary = useStore((state) => state.setDictionary);
  const setSettings = useStore((state) => state.setSettings);
  const setAppState = useStore((state) => state.setAppState);
  const setDictionaries = useStore((state) => state.setDictionaries);
  const setActiveDictionaryId = useStore((state) => state.setActiveDictionaryId);
  const setProfile = useStore((state) => state.setProfile);
  const isOffline = useStore((state) => state.isOffline);

  useEffect(() => {
    if (!token) return;
    apiClient.get('/auth/me')
      .then((res) => {
        if (res.data.user) {
          setProfile(res.data.user);
        }
      })
      .catch((error) => console.error('Failed to refresh user profile:', error));
    apiClient.get('/dictionaries')
      .then((res) => {
        if (res.data.dictionaries) {
          setDictionaries(res.data.dictionaries);
          if (res.data.activeDictionaryId) {
            setActiveDictionaryId(res.data.activeDictionaryId);
          }
        }
      })
      .catch((error) => console.error('Failed to load dictionaries:', error));

    apiClient.get('/dictionary')
      .then((res) => {
        if (res.data.dictionary) {
          setDictionary(res.data.dictionary);
        }
      })
      .catch((error) => console.error('Failed to load dictionary:', error));

    apiClient.get('/settings')
      .then((res) => {
        if (res.data.settings) {
          setSettings(res.data.settings);
        }
      })
      .catch((error) => console.error('Failed to load settings:', error));

    apiClient.post('/state/sync')
      .then((res) => {
        if (res.data.state) {
          setAppState(res.data.state);
        }
      })
      .catch((error) => console.error('Failed to sync state:', error));
  }, [token, setDictionary, setSettings, setAppState, setDictionaries, setActiveDictionaryId]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      <GuidelineController />
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: isMobile ? 0 : '264px',
          pb: isMobile ? '92px' : 0,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {isMobile ? (
          <Box
            sx={{
              minHeight: 64,
              px: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: (th) => alpha(th.palette.background.default, 0.92),
              borderBottom: '1px solid',
              borderColor: 'divider',
              backdropFilter: 'blur(14px)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box component="img" src="/favicon.svg" alt="" sx={{ width: 28, height: 28 }} />
              <Typography sx={{ fontWeight: 800, letterSpacing: '-0.035em' }}>CardBot</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ThemeSwitcher />
              <DictionarySelector />
              <LocaleSwitcher />
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              maxWidth: 1120,
              width: '100%',
              mx: 'auto',
              px: { xs: 2, sm: 3, md: 4 },
              pt: 2.5,
              pb: 0,
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <ThemeSwitcher />
            <DictionarySelector />
            <LocaleSwitcher />
          </Box>
        )}

        {isOffline && (
          <Alert severity="warning" sx={{ mx: { xs: 2, sm: 3 }, mt: 2 }}>
            {t('common.offlineNotice')}
          </Alert>
        )}

        <Box
          sx={{
            maxWidth: 1120,
            width: '100%',
            mx: 'auto',
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 3, md: 4 },
            flexGrow: 1,
          }}
        >
          {!token && (
            <Alert
              severity="info"
              data-testid="guest-banner"
              action={
                <Button
                  component={RouterLink}
                  to="/login"
                  color="inherit"
                  size="small"
                  variant="outlined"
                  data-testid="guest-banner-auth-btn"
                  sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', whiteSpace: 'nowrap' }}
                >
                  {t('guest.bannerAction')}
                </Button>
              }
              sx={{
                borderRadius: 3,
                mb: 3,
                alignItems: 'center',
                backgroundColor: (th) => th.palette.mode === 'dark' ? alpha(th.palette.info.main, 0.15) : '#EBF5FF',
              }}
            >
              {t('guest.bannerText')}
            </Alert>
          )}

          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
