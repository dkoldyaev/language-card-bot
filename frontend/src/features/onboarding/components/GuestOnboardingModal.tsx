import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import apiClient from '../../../shared/api/client';
import { useTranslation } from '../../../shared/i18n';
import { getInitialBaseLanguage } from '../../../shared/i18n/helpers';
import useStore, { type DictionaryItem, type DictionaryWord } from '../../../store/useStore';
import ActiveDictionaryLanguagesForm from '../../dictionary/components/ActiveDictionaryLanguagesForm';
import type { PresetItem } from '../../presets/types';

interface GuestOnboardingModalProps {
  open: boolean;
  onClose?: () => void;
}

export default function GuestOnboardingModal({ open, onClose }: GuestOnboardingModalProps) {
  const { t, locale } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [baseLanguage, setBaseLanguage] = useState(getInitialBaseLanguage(locale));
  const [targetLanguage, setTargetLanguage] = useState(locale === 'en' ? 'es' : 'en');
  const [presets, setPresets] = useState<PresetItem[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<PresetItem | null>(null);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [guestPolicy, setGuestPolicy] = useState<{ allowGuestAi: boolean; dailyLimit: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addDictionary = useStore((state) => state.addDictionary);
  const setActiveDictionaryId = useStore((state) => state.setActiveDictionaryId);
  const setDictionary = useStore((state) => state.setDictionary);

  useEffect(() => {
    if (open) {
      apiClient
        .get('/settings/guest-policy')
        .then((res) => {
          setGuestPolicy(res.data);
        })
        .catch(() => {
          setGuestPolicy({ allowGuestAi: false, dailyLimit: 0 });
        });
    }
  }, [open]);

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
      words = presetToApply.body.map((item: any) => ({
        id: wordCounter++,
        text: item.word,
        definitions: (item.definitions || []).map((defText: string) => ({
          id: defCounter++,
          text: defText,
          translation: null,
          presets: [{ id: presetToApply.id, title: presetToApply.title }],
        })),
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

    if (onClose) onClose();
  };

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      data-testid="guest-onboarding-dialog"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            p: { xs: 1, sm: 2 },
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 2.5,
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
            }}
          >
            <SchoolRoundedIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {t('guest.onboardingTitle')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('guest.onboardingSubtitle')}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {step === 1 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'text.secondary' }}>
              {t('guest.stepLanguages')}
            </Typography>
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
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary' }}>
              {t('guest.stepPresets')} ({targetLanguage.toUpperCase()})
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('guest.selectPresetDesc')}
            </Typography>

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
              <Box sx={{ display: 'grid', gap: 1.5, maxHeight: 320, overflowY: 'auto', pr: 0.5 }}>
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
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        backgroundColor: isSelected ? (th) => alpha(th.palette.primary.main, 0.08) : 'background.paper',
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
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
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
                        <Typography variant="caption" sx={{ display: 'block', mt: 1, fontWeight: 600, color: 'text.secondary' }}>
                          {wordCount} {t('dictionary.wordsCountSuffix')}
                        </Typography>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            )}

            {!guestPolicy?.allowGuestAi && (
              <Alert severity="info" sx={{ mt: 2, fontSize: '0.8rem' }}>
                {t('guest.emptyNotAllowed')}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between' }}>
        {step === 2 ? (
          <>
            <Button
              variant="text"
              startIcon={<ArrowBackRoundedIcon />}
              onClick={() => setStep(1)}
              data-testid="guest-onboarding-back-btn"
            >
              {t('common.back')}
            </Button>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {guestPolicy?.allowGuestAi && (
                <Button
                  variant="outlined"
                  onClick={() => handleFinishWithPreset(null)}
                  data-testid="guest-onboarding-start-empty-btn"
                >
                  {t('guest.startEmpty')}
                </Button>
              )}
              <Button
                variant="contained"
                disabled={!selectedPreset}
                onClick={() => handleFinishWithPreset(selectedPreset)}
                data-testid="guest-onboarding-finish-btn"
              >
                {t('guest.startLearning')}
              </Button>
            </Box>
          </>
        ) : (
          <Box sx={{ ml: 'auto' }}>
            <Button
              variant="contained"
              endIcon={<ArrowForwardRoundedIcon />}
              onClick={handleNextToPresets}
              data-testid="guest-onboarding-next-btn"
            >
              {t('common.next')}
            </Button>
          </Box>
        )}
      </DialogActions>
    </Dialog>
  );
}
