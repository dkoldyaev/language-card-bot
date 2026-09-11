import { useState, useEffect } from 'react';
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, TextField, Typography,
} from '@mui/material';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { GoogleLogin } from '@react-oauth/google';
import apiClient from '../../../shared/api/client';
import useStore from '../../../store/useStore';
import { trackEvent } from '../../../shared/lib/analytics';
import ActiveDictionaryLanguagesForm from '../../dictionary/components/ActiveDictionaryLanguagesForm';

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();

  const authProvider = import.meta.env.VITE_AUTH_PROVIDER || 'google';
  const isTestAuth = authProvider === 'test-username';
  const isRegisterRoute = location.pathname === '/register';

  const [username, setUsername] = useState('');
  const [baseLanguage, setBaseLanguage] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Google OAuth specific states
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);

  const setToken = useStore((state) => state.setToken);
  const setMercureToken = useStore((state) => state.setMercureToken);
  const setProfile = useStore((state) => state.setProfile);

  useEffect(() => {
    setError(null);
    setRegistrationSuccess(false);
  }, [location.pathname]);

  // ==========================================
  // GOOGLE OAUTH HANDLERS
  // ==========================================
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
        setProfile({
          id: user.id,
          username: user.username || user.name || user.email,
          email: user.email,
          name: user.name,
          picture: user.picture,
        });
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
    if (!baseLanguage || !targetLanguage) {
      setError('Please select both languages');
      return;
    }

    if (!tempToken) return;

    setLoading(true);
    try {
      await apiClient.post('/settings', {
        baseLanguage,
        targetLanguage,
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

  // ==========================================
  // TEST USERNAME AUTH HANDLERS
  // ==========================================
  const handleTestAuthSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (!isRegisterRoute) {
        // Login
        const response = await apiClient.post('/auth/login', { username: username.trim() });
        const { token, mercureToken, user } = response.data;
        trackEvent('Sign In');
        setToken(token);
        if (mercureToken) setMercureToken(mercureToken);
        setProfile(user);
        navigate('/');
      } else {
        // Registration
        if (!baseLanguage || !targetLanguage) {
          setError('Please select both languages');
          setLoading(false);
          return;
        }

        const response = await apiClient.post('/auth/register', { username: username.trim() });
        const { token } = response.data;

        await apiClient.post('/settings', {
          baseLanguage,
          targetLanguage,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });

        trackEvent('Sign Up');
        setRegistrationSuccess(true);
      }
    } catch (err: any) {
      console.error('Auth error', err.response?.data);
      setError(err.response?.data?.error || 'Authentication failed');
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
              {isTestAuth ? (
                // ==========================================
                // TEST USERNAME FORM
                // ==========================================
                <Box>
                  <Typography variant="overline" color="secondary.main">
                    {isRegisterRoute ? 'Create Account' : 'Welcome Back'}
                  </Typography>
                  <Typography variant="h5" sx={{ fontSize: { xs: '1.75rem', sm: '2.1rem' }, mt: 0.45, mb: 1, fontWeight: 700 }}>
                    {isRegisterRoute ? 'Create account' : 'Log in'}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    {isRegisterRoute
                      ? 'Choose your username and language settings to get started.'
                      : 'Sign in to collect words and turn them into focused practice.'}
                  </Typography>

                  {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

                  {registrationSuccess ? (
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                      <Alert severity="success" sx={{ mb: 2 }}>
                        Registration successful
                      </Alert>
                      <Button
                        component={RouterLink}
                        to="/login"
                        variant="contained"
                        color="secondary"
                        sx={{ mt: 1 }}
                      >
                        Back to login
                      </Button>
                    </Box>
                  ) : (
                    <Box component="form" onSubmit={handleTestAuthSubmit} sx={{ display: 'grid', gap: 2 }}>
                      <TextField
                        fullWidth
                        label="Username"
                        variant="outlined"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={loading}
                        autoComplete="username"
                        autoFocus
                      />

                      {isRegisterRoute && (
                        <ActiveDictionaryLanguagesForm
                          targetLanguage={targetLanguage}
                          baseLanguage={baseLanguage}
                          onTargetLanguageChange={setTargetLanguage}
                          onBaseLanguageChange={setBaseLanguage}
                          disabled={loading}
                        />
                      )}

                      <Button
                        type="submit"
                        variant="contained"
                        color="secondary"
                        disabled={loading}
                        endIcon={loading ? <CircularProgress size={18} color="inherit" /> : <ArrowForwardRoundedIcon />}
                        sx={{ mt: 1, py: 1.2 }}
                      >
                        {isRegisterRoute ? 'Create account' : 'Log in'}
                      </Button>

                      <Box sx={{ textAlign: 'center', mt: 1 }}>
                        {isRegisterRoute ? (
                          <Button
                            component={RouterLink}
                            to="/login"
                            variant="text"
                            sx={{ color: 'text.secondary' }}
                          >
                            Log in instead
                          </Button>
                        ) : (
                          <Button
                            component={RouterLink}
                            to="/register"
                            variant="text"
                            sx={{ color: 'text.secondary' }}
                          >
                            Sign up
                          </Button>
                        )}
                      </Box>
                    </Box>
                  )}
                </Box>
              ) : (
                // ==========================================
                // GOOGLE OAUTH FLOW
                // ==========================================
                <Box>
                  <Typography variant="overline" color="secondary.main">
                    {needsProfileCompletion ? 'Step 2 of 2' : 'Welcome'}
                  </Typography>
                  <Typography variant="h2" sx={{ fontSize: { xs: '2rem', sm: '2.45rem' }, mt: 0.45, mb: 1 }}>
                    {needsProfileCompletion ? 'Set up your dictionary' : 'Make every new word count.'}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    {needsProfileCompletion
                      ? 'Choose your learning and native languages to get started.'
                      : 'Sign in to collect words and turn them into focused practice.'}
                  </Typography>

                  {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

                  {needsProfileCompletion ? (
                    <Box sx={{ display: 'grid', gap: 2 }}>
                      <ActiveDictionaryLanguagesForm
                        targetLanguage={targetLanguage}
                        baseLanguage={baseLanguage}
                        onTargetLanguageChange={setTargetLanguage}
                        onBaseLanguageChange={setBaseLanguage}
                        disabled={loading}
                      />

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
                </Box>
              )}
            </CardContent>
          </Box>
        </Card>
      </Box>
    </Box>
  );
}
