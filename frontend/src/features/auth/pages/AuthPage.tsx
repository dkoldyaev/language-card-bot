import { useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, FormControl, InputLabel,
  MenuItem, Select, Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { GoogleLogin } from '@react-oauth/google';
import apiClient from '../../../shared/api/client';
import useStore from '../../../store/useStore';
import { trackEvent } from '../../../shared/lib/analytics';

export default function Auth() {
  const [baseLanguage, setBaseLanguage] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [desiredLevel, setDesiredLevel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const navigate = useNavigate();

  const setToken = useStore((state) => state.setToken);
  const setMercureToken = useStore((state) => state.setMercureToken);
  const setProfile = useStore((state) => state.setProfile);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError(null);
    setLoading(true);

    try {
      const response = await apiClient.post('/auth/google', {
        credential: credentialResponse.credential,
      });

      const { token, mercureToken, user } = response.data;

      if (user.isNewUser) {
        setTempToken(token);
        setNeedsProfileCompletion(true);
      } else {
        trackEvent('Sign In');
        setToken(token);
        if (mercureToken) setMercureToken(mercureToken);
        setProfile(user);
        navigate('/');
      }
    } catch (err: any) {
      console.error('Auth error', err.response?.data);
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google Login Failed');
  };

  const handleProfileCompletion = async () => {
    if (!baseLanguage || !targetLanguage || !desiredLevel) {
      setError('Please select all language settings');
      return;
    }

    if (!tempToken) return;

    setLoading(true);
    try {
      await apiClient.post('/settings', {
        baseLanguage,
        targetLanguage,
        desiredLevel,
      }, {
        headers: { Authorization: `Bearer ${tempToken}` },
      });

      setToken(tempToken);
      const meResponse = await apiClient.get('/auth/me', {
        headers: { Authorization: `Bearer ${tempToken}` },
      });
      setProfile(meResponse.data.user);
      trackEvent('Sign Up');
      navigate('/');
    } catch (err: any) {
      console.error('Profile completion error', err);
      setError('Failed to save profile settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        p: { xs: 2, sm: 4 },
      }}
    >
      <Box className="animate-scale-in" sx={{ width: '100%', maxWidth: 960 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.25, mb: 3 }}>
          <Box component="img" src="/favicon.svg" alt="" sx={{ width: 42, height: 42 }} />
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
              CardBot
            </Typography>
            <Typography variant="caption" color="text.secondary">Your word studio</Typography>
          </Box>
        </Box>

        <Card sx={{ overflow: 'hidden' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.86fr 1.14fr' } }}>
            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 520,
                p: 5,
                backgroundColor: '#172033',
                color: '#FFFFFF',
              }}
            >
              <Typography variant="overline" sx={{ color: '#E8A17F' }}>A smaller, stronger deck</Typography>
              <Box>
                <Typography variant="h2" sx={{ color: '#FFFFFF', fontSize: '2.75rem', maxWidth: 330 }}>
                  Learn the words that matter to you.
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)', mt: 2, maxWidth: 315 }}>
                  Save unfamiliar words as you meet them. Practise by recalling, not scrolling.
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.52)' }}>
                Built for calm, deliberate study.
              </Typography>
            </Box>

            <CardContent sx={{ p: { xs: 3, sm: 5 }, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: { xs: 420, md: 520 } }}>
              <Typography variant="overline" color="secondary.main">
                {needsProfileCompletion ? 'Step 2 of 2' : 'Welcome'}
              </Typography>
              <Typography variant="h2" sx={{ fontSize: { xs: '2rem', sm: '2.45rem' }, mt: 0.45, mb: 1 }}>
                {needsProfileCompletion ? 'Set up your deck' : 'Make every new word count.'}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {needsProfileCompletion
                  ? 'Choose a language pair and level so your cards give you the right support.'
                  : 'Sign in to collect words and turn them into focused practice.'}
              </Typography>

              {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

              {needsProfileCompletion ? (
                <Box sx={{ display: 'grid', gap: 1.5 }}>
                  <FormControl fullWidth>
                    <InputLabel id="base-language-label">Native Language</InputLabel>
                    <Select
                      labelId="base-language-label"
                      value={baseLanguage}
                      label="Native Language"
                      onChange={(event) => setBaseLanguage(event.target.value)}
                      disabled={loading}
                    >
                      <MenuItem value="ru">Russian</MenuItem>
                      <MenuItem value="en">English</MenuItem>
                      <MenuItem value="es">Spanish</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel id="target-language-label">Learning Language</InputLabel>
                    <Select
                      labelId="target-language-label"
                      value={targetLanguage}
                      label="Learning Language"
                      onChange={(event) => setTargetLanguage(event.target.value)}
                      disabled={loading}
                    >
                      <MenuItem value="en">English</MenuItem>
                      <MenuItem value="es">Spanish</MenuItem>
                      <MenuItem value="ru">Russian</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel id="level-label">Level</InputLabel>
                    <Select
                      labelId="level-label"
                      value={desiredLevel}
                      label="Level"
                      onChange={(event) => setDesiredLevel(event.target.value)}
                      disabled={loading}
                    >
                      <MenuItem value="A0">A0</MenuItem>
                      <MenuItem value="A1">A1</MenuItem>
                      <MenuItem value="A2">A2</MenuItem>
                      <MenuItem value="B1">B1</MenuItem>
                      <MenuItem value="B2">B2</MenuItem>
                      <MenuItem value="C1">C1</MenuItem>
                      <MenuItem value="C2">C2</MenuItem>
                    </Select>
                  </FormControl>

                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleProfileCompletion}
                    disabled={loading}
                    endIcon={loading ? <CircularProgress size={18} color="inherit" /> : <ArrowForwardRoundedIcon />}
                    sx={{ mt: 1 }}
                  >
                    Continue
                  </Button>
                </Box>
              ) : (
                <Box sx={{ width: '100%', minHeight: 44, display: 'flex', alignItems: 'center' }}>
                  {loading ? (
                    <CircularProgress size={24} />
                  ) : (
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                      theme="outline"
                      size="large"
                      shape="rectangular"
                      text="continue_with"
                      width="100%"
                    />
                  )}
                </Box>
              )}
            </CardContent>
          </Box>
        </Card>
      </Box>
    </Box>
  );
}
