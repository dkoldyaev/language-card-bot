import { Alert, alpha, Box, Button, Typography, useMediaQuery, useTheme } from '@mui/material';
import { lazy, Suspense, useEffect } from 'react';
import { Outlet, Link as RouterLink } from 'react-router-dom';
import useStore from '../../store/useStore';
import apiClient from '../api/client';
import { useActiveDictionaryId } from '../hooks/useActiveDictionaryId';
import { useTranslation } from '../i18n/I18nContext';
import { radiusTokens, spacingTokens } from '../ui/tokens';
import DictionarySelector from './DictionarySelector';
import LocaleSwitcher from './LocaleSwitcher';
import Sidebar from './Sidebar';
import ThemeSwitcher from './ThemeSwitcher';

const GuidelineController = lazy(
  () => import('../../features/guideline/components/GuidelineController')
);

export default function Layout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { t } = useTranslation();
  const token = useStore((state) => state.token);
  const setDictionary = useStore((state) => state.setDictionary);
  const setAppState = useStore((state) => state.setAppState);
  const setDictionaries = useStore((state) => state.setDictionaries);
  const setProfile = useStore((state) => state.setProfile);
  const activeDictionaryId = useActiveDictionaryId();
  const setIsDictionaryLoading = useStore((state) => state.setIsDictionaryLoading);
  const dictionaries = useStore((state) => state.dictionaries);
  const activeDictionary = dictionaries.find((dictionary) => dictionary.id === activeDictionaryId);

  // Centralized dictionary fetcher: whenever the active dictionary changes (via `/dictionaries`, `/state/sync`, or Mercure), fetch its words.
  useEffect(() => {
    if (!token || !activeDictionaryId) {
      if (!token) setIsDictionaryLoading(false);
      return;
    }
    
    setIsDictionaryLoading(true);
    apiClient.get('/dictionary', { params: { dictionaryId: activeDictionaryId } })
      .then((res) => {
        if (res.data.dictionary) {
          setDictionary(res.data.dictionary, activeDictionaryId);
        }
      })
      .catch((err) => console.error('Failed to load active dictionary:', err))
      .finally(() => setIsDictionaryLoading(false));

  }, [token, activeDictionaryId, setDictionary, setIsDictionaryLoading]);

  useEffect(() => {
    if (!activeDictionary) return;

    apiClient.get('/preset', { params: { for_language: activeDictionary.targetLanguage } })
      .then((res) => {
        useStore.getState().setPresets(res.data.presets || []);
      })
      .catch((err) => console.error('Failed to load presets:', err));
  }, [activeDictionary]);

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
          
          if (res.data.dictionaries.length === 0) {
            // Self-heal: if backend has no dictionaries, clear the local fake ones
            setDictionary([]);
            setIsDictionaryLoading(false);
          }
        }
      })
      .catch((error) => {
        console.error('Failed to load dictionaries:', error);
        setIsDictionaryLoading(false);
      });

    apiClient.post('/state/sync')
      .then((res) => {
        if (res.data.state) {
          setAppState(res.data.state);
        }
      })
      .catch((error) => console.error('Failed to sync state:', error));
  }, [token, setDictionary, setAppState, setDictionaries, setProfile, setIsDictionaryLoading]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      <Suspense fallback={null}>
        <GuidelineController />
      </Suspense>
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
              px: spacingTokens.page_outer_horizontal_padding,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: (th) => alpha(th.palette.background.default, 0.92),
              borderBottom: '1px solid',
              borderColor: 'divider',
              backdropFilter: 'blur(14px)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: spacingTokens.element_group_gap }}>
              <Box component="img" src="/favicon.svg" alt="" sx={{ width: 28, height: 28 }} />
              <Typography sx={{ fontWeight: 800, letterSpacing: '-0.035em' }}>CardBot</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: spacingTokens.element_group_gap, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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
              px: spacingTokens.page_outer_horizontal_padding,
              pt: spacingTokens.page_outer_vertical_padding,
              pb: 0,
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: spacingTokens.element_group_gap * 1.5,
              flexWrap: 'wrap',
            }}
          >
            <ThemeSwitcher />
            <DictionarySelector />
            <LocaleSwitcher />
          </Box>
        )}

        <Box
          sx={{
            maxWidth: 1120,
            width: '100%',
            mx: 'auto',
            px: spacingTokens.page_outer_horizontal_padding,
            py: spacingTokens.page_outer_vertical_padding,
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
                  sx={{ borderRadius: `${radiusTokens.sm}px`, fontWeight: 700, textTransform: 'none', whiteSpace: 'nowrap' }}
                >
                  {t('guest.bannerAction')}
                </Button>
              }
              sx={{
                borderRadius: `${radiusTokens.lg}px`,
                mb: spacingTokens.section_header_gap * 1.5,
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
