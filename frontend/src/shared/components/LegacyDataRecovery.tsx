import { Alert, Box, Button, CircularProgress, Paper, Typography } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { migrateLegacyData } from '../../features/auth/api/migrateLegacyData';
import { detectBrowserLanguage, useTranslation } from '../i18n';
import useStore from '../../store/useStore';

interface LegacyDataRecoveryProps {
  createAnonymousSession: () => Promise<void>;
  completeLegacyRecovery: () => void;
}

export default function LegacyDataRecovery({ createAnonymousSession, completeLegacyRecovery }: LegacyDataRecoveryProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasAnonymousSession = useStore((state) => state.profile?.isAnonymous === true);
  const setToken = useStore((state) => state.setToken);
  const setMercureToken = useStore((state) => state.setMercureToken);
  const setProfile = useStore((state) => state.setProfile);

  const continueAnonymously = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!hasAnonymousSession) await createAnonymousSession();
      await migrateLegacyData();
      completeLegacyRecovery();
    } catch (migrationError) {
      console.error('Legacy data migration failed:', migrationError);
      setError(t('auth.recoveryFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Paper sx={{ width: '100%', maxWidth: 520, p: { xs: 3, sm: 4 }, borderRadius: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>{t('auth.recoveryTitle')}</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>{t('auth.recoveryDescription')}</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          <Button variant="contained" onClick={continueAnonymously} disabled={loading}>
            {loading ? <CircularProgress size={20} color="inherit" /> : t('auth.recoveryContinue')}
          </Button>
          <Button
            variant="outlined"
            disabled={loading}
            onClick={() => {
              // The local data remains intact; the unfinished anonymous session is not
              // sent to the existing-account login endpoint.
              setToken(null);
              setMercureToken(null);
              setProfile(null);
              navigate(`/${detectBrowserLanguage()}/login`);
            }}
          >
            {t('auth.recoverySignIn')}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
