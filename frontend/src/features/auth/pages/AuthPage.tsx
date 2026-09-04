import { useState } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Alert,
  FormControl, InputLabel, Select, MenuItem, alpha, CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import { GoogleLogin } from '@react-oauth/google';
import apiClient from '../../../shared/api/client';
import useStore from '../../../store/useStore';

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
        desiredLevel
      }, {
        headers: { Authorization: `Bearer ${tempToken}` }
      });

      // Complete login
      setToken(tempToken);
      
      // Ideally we'd fetch profile and mercure token again, or they are passed down.
      // For simplicity, let's redirect to main page, it might fetch /me on reload,
      // but let's assume we need to reload or we can fetch /me here:
      const meResponse = await apiClient.get('/auth/me', {
        headers: { Authorization: `Bearer ${tempToken}` }
      });
      setProfile(meResponse.data.user);
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        background: `
          radial-gradient(ellipse at 30% 20%, ${alpha('#7C3AED', 0.15)} 0%, transparent 50%),
          radial-gradient(ellipse at 70% 80%, ${alpha('#06B6D4', 0.1)} 0%, transparent 50%),
          #0B0E14
        `,
      }}
    >
      <Box className="animate-scale-in" sx={{ width: '100%', maxWidth: 420 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
              boxShadow: `0 8px 30px ${alpha('#7C3AED', 0.4)}`,
            }}
          >
            <AutoStoriesRoundedIcon sx={{ color: '#fff', fontSize: 28 }} />
          </Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #A78BFA, #22D3EE)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            CardBot
          </Typography>
          <Typography variant="body2" color="text.secondary">
            English Learning Assistant
          </Typography>
        </Box>

        <Card
          sx={{
            backgroundColor: alpha('#111827', 0.8),
            backdropFilter: 'blur(20px)',
          }}
        >
          <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h5" gutterBottom align="center" sx={{ fontWeight: 600, mb: 3 }}>
              {needsProfileCompletion ? 'Complete your profile' : 'Sign in'}
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2, width: '100%' }}>{error}</Alert>}

            {needsProfileCompletion ? (
              <Box sx={{ width: '100%' }}>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="base-language-label">Native Language</InputLabel>
                  <Select
                    labelId="base-language-label"
                    value={baseLanguage}
                    label="Native Language"
                    onChange={(e) => setBaseLanguage(e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="ru">Russian</MenuItem>
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="es">Spanish</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth margin="normal">
                  <InputLabel id="target-language-label">Learning Language</InputLabel>
                  <Select
                    labelId="target-language-label"
                    value={targetLanguage}
                    label="Learning Language"
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="es">Spanish</MenuItem>
                    <MenuItem value="ru">Russian</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth margin="normal">
                  <InputLabel id="level-label">Level</InputLabel>
                  <Select
                    labelId="level-label"
                    value={desiredLevel}
                    label="Level"
                    onChange={(e) => setDesiredLevel(e.target.value)}
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
                  fullWidth
                  variant="contained"
                  onClick={handleProfileCompletion}
                  disabled={loading}
                  sx={{
                    mt: 3,
                    py: 1.3,
                    background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                    },
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Continue'}
                </Button>
              </Box>
            ) : (
              <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {loading ? (
                   <CircularProgress size={24} sx={{ my: 2 }} />
                ) : (
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    theme="filled_black"
                    size="large"
                    shape="pill"
                    text="continue_with"
                    width="100%"
                  />
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
