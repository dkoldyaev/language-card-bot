import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import apiClient from '../../../shared/api/client';
import LocaleSwitcher from '../../../shared/components/LocaleSwitcher';
import ThemeSwitcher from '../../../shared/components/ThemeSwitcher';
import type { LanguageCode } from '../../../shared/i18n';
import { getInitialBaseLanguage } from '../../../shared/i18n/helpers';
import { useTranslation } from '../../../shared/i18n/I18nContext';
import { hasExistingLocalStorage } from '../../../shared/lib/storage';
import {
  AppButton,
  colorTokens,
  radiusTokens,
  spacingTokens,
} from '../../../shared/ui';
import useStore, { type DictionaryItem, type DictionaryWord } from '../../../store/useStore';
import ActiveDictionaryLanguagesForm from '../../dictionary/components/ActiveDictionaryLanguagesForm';
import type { PresetDefinitionItem, PresetItem, WordDefinitionPresetItem } from '../../presets/types';

export default function OnboardingPage() {
  const { t, locale } = useTranslation();
  const navigate = useNavigate();

  const token = useStore((state) => state.token);
  const addDictionary = useStore((state) => state.addDictionary);
  const setActiveDictionaryId = useStore((state) => state.setActiveDictionaryId);
  const setDictionary = useStore((state) => state.setDictionary);
  const setHasSeenOnboarding = useStore((state) => state.setHasSeenOnboarding);
  const setHasCompletedGuestOnboarding = useStore((state) => state.setHasCompletedGuestOnboarding);

  const [step, setStep] = useState<1 | 2>(1);
  const [baseLanguage, setBaseLanguage] = useState<LanguageCode>(getInitialBaseLanguage(locale));
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>(locale === 'en' ? 'es' : 'en');
  const [presets, setPresets] = useState<PresetItem[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<PresetItem | null>(null);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [guestPolicy, setGuestPolicy] = useState<{ allowGuestAi: boolean; dailyLimit: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token || hasExistingLocalStorage()) {
      navigate('/', { replace: true });
    }
  }, [token, navigate]);

  useEffect(() => {
    apiClient
      .get('/settings/guest-policy')
      .then((res) => {
        setGuestPolicy(res.data);
      })
      .catch(() => {
        setGuestPolicy({ allowGuestAi: false, dailyLimit: 0 });
      });
  }, []);

  const handleNextToPresets = async () => {
    if (!targetLanguage || !baseLanguage) {
      setError(t('auth.selectBothLanguages'));
      return;
    }
    if (targetLanguage === baseLanguage) {
      setError(t('dictionary.languagesMustDiffer'));
      return;
    }

    setError(null);
    setLoadingPresets(true);
    setStep(2);

    try {
      const res = await apiClient.get('/preset', {
        params: { for_language: targetLanguage },
      });
      const list = res.data.presets || [];
      setPresets(list);
      if (list.length > 0) {
        setSelectedPreset(list[0]);
      } else {
        setSelectedPreset(null);
      }
    } catch (err) {
      console.error('Failed to load presets for onboarding:', err);
      setPresets([]);
    } finally {
      setLoadingPresets(false);
    }
  };

  const handleFinishWithPreset = (presetToApply: PresetItem | null) => {
    let words: DictionaryWord[] = [];
    let wordCount = 0;

    if (presetToApply && Array.isArray(presetToApply.body)) {
      let wordCounter = 1;
      let defCounter = 1;
      words = presetToApply.body.map((item: WordDefinitionPresetItem) => ({
        id: wordCounter++,
        text: item.word,
        definitions: (item.definitions || []).map((def: PresetDefinitionItem) => {
          const text = typeof def === 'string' ? def : (def?.text || '');
          const transText =
            typeof def === 'object' && def?.translations && baseLanguage
              ? def.translations[baseLanguage] || null
              : typeof def === 'object' && typeof def?.translation === 'string'
              ? def.translation
              : null;
          return {
            id: defCounter++,
            text,
            translation: transText ? { id: defCounter, text: transText } : null,
            presets: [{ id: presetToApply.id, title: presetToApply.title }],
          };
        }),
        presets: [{ id: presetToApply.id, title: presetToApply.title }],
      }));
      wordCount = words.length;
    }

    const dictId = Date.now();
    const newDict: DictionaryItem = {
      id: dictId,
      name: presetToApply ? presetToApply.title : `${targetLanguage.toUpperCase()} Deck`,
      targetLanguage,
      baseLanguage,
      wordCount,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    addDictionary(newDict);
    setActiveDictionaryId(dictId);
    setDictionary(words);
    setHasSeenOnboarding(true);
    setHasCompletedGuestOnboarding(true);

    navigate('/', { replace: true });
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        p: { xs: 2, sm: 4 },
      }}
      data-testid="onboarding-page-container"
    >
      <Box className="animate-scale-in" sx={{ width: '100%', maxWidth: 960 }}>
        {/* Top bar with Branding, ThemeSwitcher, LocaleSwitcher */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: spacingTokens.element_group_gap * 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box component="img" src="/favicon.svg" alt="" sx={{ width: 42, height: 42 }} />
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
                CardBot
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('auth.brandSubtitle')}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ThemeSwitcher />
            <LocaleSwitcher />
          </Box>
        </Box>

        {/* Main Card */}
        <Card
          sx={{
            overflow: 'hidden',
            borderRadius: `${radiusTokens.xl}px`,
            border: '1px solid',
            borderColor: 'divider',
          }}
          data-testid="guest-onboarding-dialog"
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.86fr 1.14fr' } }}>
            {/* Left Brand Panel (Desktop) */}
            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 520,
                p: 5,
                backgroundColor: (th) =>
                  th.palette.mode === 'dark' ? colorTokens.hero.darkBg : colorTokens.hero.lightBg,
                color: '#FFFFFF',
              }}
            >
              <Typography variant="overline" sx={{ color: colorTokens.hero.accent, fontWeight: 800 }}>
                {t('guest.onboardingTitle')}
              </Typography>
              <Box>
                <Typography variant="h2" sx={{ color: '#FFFFFF', fontSize: '2.5rem', maxWidth: 330, lineHeight: 1.2, fontWeight: 850 }}>
                  {t('guest.onboardingSubtitle')}
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)', mt: 2, maxWidth: 315 }}>
                  {t('guest.selectPresetDesc')}
                </Typography>
              </Box>
              <Box>
                <AppButton
                  component={RouterLink}
                  to={`/${locale}/login`}
                  variant="outline"
                  sx={{
                    color: '#FFFFFF',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    '&:hover': {
                      borderColor: '#FFFFFF',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    },
                  }}
                >
                  {t('guest.loginOrRegisterBtn')}
                </AppButton>
              </Box>
            </Box>

            {/* Right Interactive Form */}
            <CardContent
              sx={{
                p: { xs: 3, sm: 5 },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: { xs: 420, md: 520 },
              }}
            >
              <Box>
                <Typography variant="overline" color="secondary.main" sx={{ fontWeight: 800 }}>
                  {step === 1 ? t('guest.stepLanguages') : t('guest.stepPresets')}
                </Typography>
                <Typography variant="h5" sx={{ fontSize: { xs: '1.5rem', sm: '1.8rem' }, mt: 0.5, mb: 1, fontWeight: 800 }}>
                  {step === 1
                    ? t('guest.stepLanguages')
                    : `${t('guest.stepPresets')} (${targetLanguage.toUpperCase()})`}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {step === 1 ? t('guest.onboardingSubtitle') : t('guest.selectPresetDesc')}
                </Typography>

                {error && (
                  <Alert severity="error" sx={{ mb: 2.5, borderRadius: `${radiusTokens.sm}px` }}>
                    {error}
                  </Alert>
                )}

                {step === 1 && (
                  <Box sx={{ mt: 1 }}>
                    <ActiveDictionaryLanguagesForm
                      targetLanguage={targetLanguage}
                      baseLanguage={baseLanguage}
                      onTargetLanguageChange={(lang) => {
                        setTargetLanguage(lang);
                        setError(null);
                      }}
                      onBaseLanguageChange={(lang) => {
                        setBaseLanguage(lang);
                        setError(null);
                      }}
                    />
                  </Box>
                )}

                {step === 2 && (
                  <Box sx={{ mt: 1 }}>
                    {loadingPresets ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={32} />
                      </Box>
                    ) : presets.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                          {t('guest.noPresetsFound')}
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'grid', gap: 1.5, maxHeight: 280, overflowY: 'auto', pr: 0.5 }}>
                        {presets.map((preset) => {
                          const isSelected = selectedPreset?.id === preset.id;
                          const wordCount = Array.isArray(preset.body) ? preset.body.length : 0;
                          return (
                            <Card
                              key={preset.id}
                              variant="outlined"
                              data-testid={`preset-card-${preset.id}`}
                              onClick={() => setSelectedPreset(preset)}
                              sx={{
                                cursor: 'pointer',
                                borderRadius: `${radiusTokens.md}px`,
                                borderColor: isSelected ? 'primary.main' : 'divider',
                                backgroundColor: isSelected
                                  ? (th) => alpha(th.palette.primary.main, 0.08)
                                  : 'background.paper',
                                transition: 'all 0.2s',
                                '&:hover': {
                                  borderColor: 'primary.main',
                                },
                              }}
                            >
                              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <LayersRoundedIcon fontSize="small" color={isSelected ? 'primary' : 'action'} />
                                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                      {preset.title}
                                    </Typography>
                                  </Box>
                                  {isSelected && <CheckRoundedIcon color="primary" fontSize="small" />}
                                </Box>
                                {preset.description && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                    {preset.description}
                                  </Typography>
                                )}
                                <Typography variant="caption" sx={{ display: 'block', mt: 1, fontWeight: 700, color: 'text.secondary' }}>
                                  {t('dictionary.wordsCount', { count: wordCount })}
                                </Typography>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </Box>
                    )}

                    {!guestPolicy?.allowGuestAi && (
                      <Alert severity="info" sx={{ mt: 2, fontSize: '0.8rem', borderRadius: `${radiusTokens.sm}px` }}>
                        {t('guest.emptyNotAllowed')}
                      </Alert>
                    )}
                  </Box>
                )}
              </Box>

              {/* Actions */}
              <Box sx={{ pt: 3 }}>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {step === 2 ? (
                    <>
                      <Button
                        variant="text"
                        startIcon={<ArrowBackRoundedIcon />}
                        onClick={() => setStep(1)}
                        data-testid="guest-onboarding-back-btn"
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                      >
                        {t('common.back')}
                      </Button>
                      <Box sx={{ display: 'flex', gap: spacingTokens.element_group_gap }}>
                        {guestPolicy?.allowGuestAi && (
                          <AppButton
                            variant="outline"
                            onClick={() => handleFinishWithPreset(null)}
                            data-testid="guest-onboarding-start-empty-btn"
                          >
                            {t('guest.startEmpty')}
                          </AppButton>
                        )}
                        <AppButton
                          variant="primary"
                          disabled={!selectedPreset}
                          onClick={() => handleFinishWithPreset(selectedPreset)}
                          data-testid="guest-onboarding-finish-btn"
                        >
                          {t('guest.startLearning')}
                        </AppButton>
                      </Box>
                    </>
                  ) : (
                    <>
                      <Button
                        component={RouterLink}
                        to={`/${locale}/login`}
                        variant="text"
                        sx={{ textTransform: 'none', fontWeight: 600, display: { xs: 'inline-flex', md: 'none' } }}
                      >
                        {t('guest.loginOrRegisterBtn')}
                      </Button>
                      <Box sx={{ ml: 'auto' }}>
                        <AppButton
                          variant="primary"
                          endIcon={<ArrowForwardRoundedIcon />}
                          onClick={handleNextToPresets}
                          data-testid="guest-onboarding-next-btn"
                        >
                          {t('common.next')}
                        </AppButton>
                      </Box>
                    </>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Box>
        </Card>
      </Box>
    </Box>
  );
}
