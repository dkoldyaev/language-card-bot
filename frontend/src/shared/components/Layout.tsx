import { Outlet } from 'react-router-dom';
import { Box, useMediaQuery, useTheme, Alert } from '@mui/material';
import Sidebar from './Sidebar';
import { useEffect } from 'react';
import apiClient from '../api/client';
import useStore from '../../store/useStore';

export default function Layout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const setDictionary = useStore((state) => state.setDictionary);
  const setSettings = useStore((state) => state.setSettings);
  const setAppState = useStore((state) => state.setAppState);
  const isOffline = useStore((state) => state.isOffline);

  useEffect(() => {
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
  }, [setDictionary, setSettings, setAppState]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: isMobile ? 0 : '240px',
          pb: isMobile ? '80px' : 0,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {isOffline && (
          <Alert severity="warning" variant="filled" square sx={{ width: '100%' }}>
            You are offline. Only the quiz and offline dictionary edits are available. Changes will be synced when you reconnect.
          </Alert>
        )}
        <Box
          sx={{
            maxWidth: 960,
            width: '100%',
            mx: 'auto',
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 3, md: 4 },
            flexGrow: 1,
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
