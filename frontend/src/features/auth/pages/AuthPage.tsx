import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, Typography,
} from '@mui/material';
import { type CredentialResponse, GoogleLogin } from '@react-oauth/google';
import { isAxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../../../shared/api/client';
import LocaleSwitcher from '../../../shared/components/LocaleSwitcher';
import ThemeSwitcher from '../../../shared/components/ThemeSwitcher';
import type { LanguageCode } from '../../../shared/i18n';
import { getInitialBaseLanguage, saveBaseLanguage } from '../../../shared/i18n/helpers';
import { useTranslation } from '../../../shared/i18n/I18nContext';
import { trackEvent } from '../../../shared/lib/analytics';
import { AppButton, AppTextField, radiusTokens, spacingTokens } from '../../../shared/ui';
import useStore, { type UserProfile } from '../../../store/useStore';
import ActiveDictionaryLanguagesForm from '../../dictionary/components/ActiveDictionaryLanguagesForm';
import { performGuestMigration } from '../api/migrate';
import MergeGuestDataDialog from '../components/MergeGuestDataDialog';

interface AuthUserData extends UserProfile {
  isNewUser?: boolean;
}

interface AuthData {
  token: string;
  mercureToken?: string;
  user: AuthUserData;
}

export default function Auth() {
  const { t, locale } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const authProvider = import.meta.env.VITE_AUTH_PROVIDER;
  const isTestAuth = authProvider === 'test-username';
  const isRegisterRoute = location.pathname === '/register';

  const [username, setUsername] = useState('');
  const [baseLanguage, setBaseLanguage] = useState<LanguageCode | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>(getInitialBaseLanguage(locale));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Google OAuth specific states
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);

  // Guest merge dialog states
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [pendingAuthData, setPendingAuthData] = useState<AuthData | null>(null);
  const [merging, setMerging] = useState(false);

  const token = useStore((state) => state.token);
  const setToken = useStore((state) => state.setToken);
  const setMercureToken = useStore((state) => state.setMercureToken);
  const setProfile = useStore((state) => state.setProfile);
  const clearGuestData = useStore((state) => state.clearGuestData);

  useEffect(() => {
    if (token) {
      navigate('/', { replace: true });
    }
  }, [token, navigate]);

  const completeLogin = (authData: AuthData) => {
    trackEvent('Sign In');
    setToken(authData.token);
    if (authData.mercureToken) setMercureToken(authData.mercureToken);
    setProfile({
      id: authData.user.id,
      username: authData.user.username,
      email: authData.user.email,
      name: authData.user.name,
      picture: authData.user.picture,
    });
    navigate('/');
  };

  const handleConfirmMerge = async () => {
    if (!pendingAuthData) return;
    setMerging(true);
    try {
      await performGuestMigration(pendingAuthData.token, 'merge');
      completeLogin(pendingAuthData);
    } catch (err) {
      console.error('Failed to merge guest data:', err);
      completeLogin(pendingAuthData);
    } finally {
      setMerging(false);
      setMergeDialogOpen(false);
    }
  };

  const handleDiscardGuestData = () => {
    if (!pendingAuthData) return;
    clearGuestData();
    completeLogin(pendingAuthData);
    setMergeDialogOpen(false);
  };

  const handleChangeBaseLanguage = (language: LanguageCode) => {
    setBaseLanguage(language);
    saveBaseLanguage(language);
  };

  useEffect(() => {
    setError(null);
    setRegistrationSuccess(false);
  }, []);

  // ==========================================
  // GOOGLE OAUTH HANDLERS
  // ==========================================
  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
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
        const hasGuestData = useStore.getState().dictionary.length > 0 || useStore.getState().guestQuizAttempts.length > 0;
        if (hasGuestData) {
          setPendingAuthData({ token, mercureToken, user });
          setMergeDialogOpen(true);
        } else {
          completeLogin({ token, mercureToken, user });
        }
      }
    } catch (err: unknown) {
      console.error('Auth error', isAxiosError(err) ? err.response?.data : err);
      const message = isAxiosError<{ error?: string }>(err) ? err.response?.data?.error : undefined;
      setError(message || t('auth.authFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError(t('auth.googleLoginFailed'));
  };

  const handleProfileCompletion = async () => {
    if (!baseLanguage || !targetLanguage) {
      setError(t('auth.selectBothLanguages'));
      return;
    }

    if (!tempToken) return;

    setLoading(true);
    try {


      // Migrate any guest data to the newly created user
      const hasGuestData = useStore.getState().dictionary.length > 0 || useStore.getState().guestQuizAttempts.length > 0;
      if (hasGuestData) {
        try {
          await performGuestMigration(tempToken, 'merge');
        } catch (e) {
          console.error('Failed to migrate guest data on Google sign up:', e);
        }
      }

      setToken(tempToken);
      const meResponse = await apiClient.get('/auth/me', {
        headers: { Authorization: `Bearer ${tempToken}` },
      });
      setProfile(meResponse.data.user);
      trackEvent('Sign Up');
      navigate('/');
    } catch (err: unknown) {
      console.error('Profile completion error', err);
      setError(t('auth.profileSetupFailed'));
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
      setError(t('auth.enterUsername'));
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (!isRegisterRoute) {
        // Login
        const response = await apiClient.post('/auth/login', { username: username.trim() });
        const { token, mercureToken, user } = response.data;
        const hasGuestData = useStore.getState().dictionary.length > 0 || useStore.getState().guestQuizAttempts.length > 0;
        if (hasGuestData) {
          setPendingAuthData({ token, mercureToken, user });
          setMergeDialogOpen(true);
        } else {
          completeLogin({ token, mercureToken, user });
        }
      } else {
        // Registration
        const response = await apiClient.post('/auth/register', { username: username.trim() });
        const { token } = response.data;



        // Migrate any guest data to the newly created user
        const hasGuestData = useStore.getState().dictionary.length > 0 || useStore.getState().guestQuizAttempts.length > 0;
        if (hasGuestData) {
          try {
            await performGuestMigration(token, 'merge');
          } catch (e) {
            console.error('Failed to migrate guest data on register:', e);
          }
        }

        trackEvent('Sign Up');
        setRegistrationSuccess(true);
      }
    } catch (err: unknown) {
      console.error('Auth error', isAxiosError(err) ? err.response?.data : err);
      const message = isAxiosError<{ error?: string }>(err) ? err.response?.data?.error : undefined;
      setError(message || t('auth.authFailed'));
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box component="img" src="/favicon.svg" alt="" sx={{ width: 42, height: 42 }} />
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
                CardBot
              </Typography>
              <Typography variant="caption" color="text.secondary">{t('auth.brandSubtitle')}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ThemeSwitcher />
            <LocaleSwitcher />
          </Box>
        </Box>

        <Card sx={{ overflow: 'hidden', maxWidth: 480, mx: 'auto' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>

            <CardContent sx={{ p: { xs: 3, sm: 5 }, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: { xs: 420, md: 520 } }}>
              {isTestAuth ? (
                // ==========================================
                // TEST USERNAME FORM
                // ==========================================
                <Box>
                  <Typography variant="overline" color="secondary.main" sx={{ fontWeight: 800 }}>
                    {isRegisterRoute ? t('auth.createAccountOverline') : t('auth.welcomeBackOverline')}
                  </Typography>
                  <Typography variant="h5" sx={{ fontSize: { xs: '1.75rem', sm: '2.1rem' }, mt: 0.45, mb: 1, fontWeight: 800 }}>
                    {isRegisterRoute ? t('auth.createAccountTitle') : t('auth.loginTitle')}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    {isRegisterRoute
                      ? t('auth.createAccountDesc')
                      : t('auth.loginDesc')}
                  </Typography>

                  {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: `${radiusTokens.sm}px` }}>{error}</Alert>}

                  {registrationSuccess ? (
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                      <Alert severity="success" sx={{ mb: 2, borderRadius: `${radiusTokens.sm}px` }}>
                        {t('auth.registrationSuccess')}
                      </Alert>
                      <AppButton
                        component={RouterLink}
                        to="/login"
                        variant="secondary"
                        sx={{ mt: 1 }}
                      >
                        {t('auth.backToLogin')}
                      </AppButton>
                    </Box>
                  ) : (
                    <Box component="form" onSubmit={handleTestAuthSubmit} sx={{ display: 'grid', gap: spacingTokens.form_field_gap }}>
                      <AppTextField
                        fullWidth
                        label={t('auth.usernameLabel')}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={loading}
                        autoComplete="username"
                        autoFocus
                      />

                      <AppButton
                        type="submit"
                        variant="secondary"
                        size="large"
                        disabled={loading}
                        loading={loading}
                        endIcon={<ArrowForwardRoundedIcon />}
                        sx={{ mt: 1 }}
                      >
                        {isRegisterRoute ? t('auth.submitRegister') : t('auth.submitLogin')}
                      </AppButton>

                      <Box sx={{ textAlign: 'center', mt: 1 }}>
                        {isRegisterRoute ? (
                          <Button
                            component={RouterLink}
                            to="/login"
                            variant="text"
                            sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 600 }}
                          >
                            {t('auth.loginInstead')}
                          </Button>
                        ) : (
                          <Button
                            component={RouterLink}
                            to="/register"
                            variant="text"
                            sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 600 }}
                          >
                            {t('auth.signUp')}
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
                    {needsProfileCompletion ? t('auth.step2Overline') : t('auth.welcomeOverline')}
                  </Typography>
                  <Typography variant="h2" sx={{ fontSize: { xs: '2rem', sm: '2.45rem' }, mt: 0.45, mb: 1 }}>
                    {needsProfileCompletion ? t('auth.googleStep2Title') : t('auth.googleWelcomeTitle')}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    {needsProfileCompletion
                      ? t('auth.googleStep2Desc')
                      : t('auth.googleWelcomeDesc')}
                  </Typography>

                  {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

                  {needsProfileCompletion ? (
                    <Box sx={{ display: 'grid', gap: 2 }}>
                      <ActiveDictionaryLanguagesForm
                        targetLanguage={targetLanguage}
                        baseLanguage={baseLanguage}
                        onTargetLanguageChange={setTargetLanguage}
                        onBaseLanguageChange={handleChangeBaseLanguage}
                        disabled={loading}
                      />

                      <AppButton
                        variant="secondary"
                        size="large"
                        onClick={handleProfileCompletion}
                        disabled={loading}
                        loading={loading}
                        endIcon={<ArrowForwardRoundedIcon />}
                        sx={{ mt: 1 }}
                      >
                        {t('auth.continue')}
                      </AppButton>
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

              <Box sx={{ textAlign: 'center', mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Button
                  component={RouterLink}
                  to="/"
                  variant="text"
                  size="small"
                  data-testid="continue-as-guest-btn"
                  sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 600 }}
                >
                  {t('guest.continueWithoutAuth')}
                </Button>
              </Box>
            </CardContent>
          </Box>
        </Card>
      </Box>

      <MergeGuestDataDialog
        open={mergeDialogOpen}
        onConfirmMerge={handleConfirmMerge}
        onDiscard={handleDiscardGuestData}
        loading={merging}
      />
    </Box>
  );
}
