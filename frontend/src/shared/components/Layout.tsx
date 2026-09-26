import { Alert, alpha, Box, Button, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useEffect } from 'react';
import { Outlet, Link as RouterLink } from 'react-router-dom';
import { GuidelineController } from '../../features/guideline';
import useStore from '../../store/useStore';
import apiClient from '../api/client';
import { useTranslation } from '../i18n/I18nContext';
import { radiusTokens, spacingTokens } from '../ui/tokens';
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
  const setSelectedDictionaryId = useStore((state) => state.setSelectedDictionaryId);
  const setProfile = useStore((state) => state.setProfile);
  const isOffline = useStore((state) => state.isOffline);
  const activeDictionaryId = useStore((state) => state.activeDictionaryId);
  const setIsDictionaryLoading = useStore((state) => state.setIsDictionaryLoading);

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
          setDictionary(res.data.dictionary);
        }
      })
      .catch((err) => console.error('Failed to load active dictionary:', err))
      .finally(() => setIsDictionaryLoading(false));

    // Also fetch presets for this dictionary's language
    const activeDict = useStore.getState().dictionaries.find(d => d.id === activeDictionaryId);
    if (activeDict) {
      apiClient.get('/preset', { params: { for_language: activeDict.targetLanguage } })
        .then((res) => {
          useStore.getState().setPresets(res.data.presets || []);
        })
        .catch((err) => console.error('Failed to load presets:', err));
    }
  }, [token, activeDictionaryId, setDictionary, setIsDictionaryLoading]);

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
          const nextActiveId = res.data.activeDictionaryId;
          
          if (nextActiveId) {
            setActiveDictionaryId(nextActiveId);
          } else if (res.data.dictionaries.length === 0) {
            // Self-heal: if backend has no dictionaries, clear the local fake ones
            setActiveDictionaryId(null);
            setDictionary([]);
            setIsDictionaryLoading(false);
          }
        }
      })
      .catch((error) => {
        console.error('Failed to load dictionaries:', error);
        setIsDictionaryLoading(false);
      });

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
  }, [token, setDictionary, setSettings, setAppState, setDictionaries, setActiveDictionaryId, setProfile, setSelectedDictionaryId]);

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

        {isOffline && (
          <Box sx={{ maxWidth: 1120, width: '100%', mx: 'auto', px: spacingTokens.page_outer_horizontal_padding, mt: spacingTokens.element_group_gap * 2 }}>
            <Alert severity="warning">
              {t('common.offlineNotice')}
            </Alert>
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
