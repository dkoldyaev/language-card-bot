import AddRoundedIcon from '@mui/icons-material/AddRounded';
import {
  Alert,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  type PaperProps,
  Select,
  Typography,
} from '@mui/material';
import { isAxiosError } from 'axios';
import { type FormEvent, useState } from 'react';
import apiClient from '../../../shared/api/client';
import { useTranslation } from '../../../shared/i18n';
import { getInitialBaseLanguage, saveBaseLanguage } from '../../../shared/i18n/helpers';
import { type LanguageCode, SUPPORTED_LANGUAGES } from '../../../shared/i18n/types';
import { AppButton, AppTextField, radiusTokens, spacingTokens } from '../../../shared/ui';
import useStore, { type DictionaryItem } from '../../../store/useStore';
import { useGuidelineStore } from '../../guideline';

type DialogPaperSlotProps = PaperProps & { 'data-testid'?: string };
interface CreateDictionaryDialogProps {
  open: boolean;
  onClose: () => void;
  onCancel?: () => void;
  onCreated?: (dict: DictionaryItem) => void;
}

export default function CreateDictionaryDialog({
  open,
  onClose,
  onCancel,
  onCreated,
}: CreateDictionaryDialogProps) {
  const { t, locale } = useTranslation();
  const [name, setName] = useState('');
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode | ''>('');
  const [baseLanguage, setBaseLanguage] = useState<LanguageCode | ''>(() => getInitialBaseLanguage(locale) as LanguageCode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = useStore((state) => state.token);
  const dictionaries = useStore((state) => state.dictionaries);
  const addDictionary = useStore((state) => state.addDictionary);
  const setDictionary = useStore((state) => state.setDictionary);

  const handleBaseLanguageChange = (newBase: LanguageCode) => {
    setBaseLanguage(newBase);
    saveBaseLanguage(newBase);
  };

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!targetLanguage || !baseLanguage) {
      setError(t('dialogs.selectBothLangsError'));
      return;
    }

    if (targetLanguage === baseLanguage) {
      setError(t('dialogs.diffLangsError'));
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      let newDict: DictionaryItem;
      if (!token) {
        const dictId = Date.now();
        const isFirst = dictionaries.length === 0;
        const defaultName = `${targetLanguage.toUpperCase()} (${baseLanguage.toUpperCase()})`;
        newDict = {
          id: dictId,
          name: name.trim().length > 0 ? name.trim() : defaultName,
          targetLanguage: targetLanguage,
          baseLanguage: baseLanguage,
          wordCount: 0,
          isActive: isFirst,
          createdAt: new Date().toISOString(),
        };
      } else {
        const payload = {
          name: name.trim().length > 0 ? name.trim() : undefined,
          targetLanguage,
          baseLanguage,
        };

        const res = await apiClient.post('/dictionaries', payload);
        newDict = res.data.dictionary;
      }

      addDictionary(newDict);
      setDictionary([], newDict.id);

      if (onCreated) {
        onCreated(newDict);
      }

      if (useGuidelineStore.getState().isActive) {
        useGuidelineStore.getState().advanceStep('step2_create_dict_dialog');
      }

      handleClose();
    } catch (err: unknown) {
      console.error('Failed to create dictionary:', err);
      const message = isAxiosError<{ message?: string; error?: string }>(err)
        ? err.response?.data?.message || err.response?.data?.error
        : undefined;
      setError(message || t('dialogs.createDeckError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setError(null);
    onClose();
  };

  const handleCancel = () => {
    handleClose();
    if (
      useGuidelineStore.getState().isActive &&
      useGuidelineStore.getState().currentStep === 'step2_create_dict_dialog'
    ) {
      useGuidelineStore.setState({ currentStep: 'step1_dict_selector' });
    }
    onCancel?.();
  };

  const handleInputFocus = () => {
    if (
      useGuidelineStore.getState().isActive &&
      useGuidelineStore.getState().currentStep === 'step2_create_dict_dialog'
    ) {
      useGuidelineStore.getState().dismissCurrentStep();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      disableAutoFocus
      disableEnforceFocus
      transitionDuration={0}
      fullWidth
      maxWidth="xs"
      slotProps={{
        paper: {
          'data-tour': 'create-dictionary-dialog-paper',
          sx: {
            borderRadius: `${radiusTokens.lg}px`,
            p: 1,
          },
        } as DialogPaperSlotProps,
      }}
    >
      <DialogTitle sx={{ pb: 1, pt: 2, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              display: 'grid',
              placeItems: 'center',
              borderRadius: '50%',
              backgroundColor: '#FBE8E0',
              color: 'secondary.dark',
              flexShrink: 0,
            }}
          >
            <AddRoundedIcon fontSize="small" />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>{t('dialogs.createDeckTitle')}</Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pt: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          {t('dialogs.createDeckDesc')}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: `${radiusTokens.sm}px` }}>
            {error}
          </Alert>
        )}

        <Box
          sx={{ display: 'grid', gap: spacingTokens.form_field_gap }}
          onFocusCapture={handleInputFocus}
          onPointerDownCapture={handleInputFocus}
        >
          <FormControl fullWidth>
            <InputLabel id="target-language-label">{t('dialogs.targetLangLabel')}</InputLabel>
            <Select
              labelId="target-language-label"
              value={targetLanguage}
              label={t('dialogs.targetLangLabel')}
              onChange={(e) => setTargetLanguage(e.target.value as LanguageCode)}
              inputProps={{ 'data-testid': 'dialog-target-language-select' }}
              sx={{ borderRadius: `${radiusTokens.md}px` }}
            >
              {SUPPORTED_LANGUAGES.map((langCode) => (
                <MenuItem key={langCode} value={langCode}>
                  {t(`languages.${langCode}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="base-language-label">{t('dialogs.nativeLangLabel')}</InputLabel>
            <Select
              labelId="base-language-label"
              value={baseLanguage}
              label={t('dialogs.nativeLangLabel')}
              onChange={(e) => handleBaseLanguageChange(e.target.value as LanguageCode)}
              inputProps={{ 'data-testid': 'dialog-native-language-select' }}
              sx={{ borderRadius: `${radiusTokens.md}px` }}
            >
              {SUPPORTED_LANGUAGES.map((langCode) => (
                <MenuItem key={langCode} value={langCode}>
                  {t(`languages.${langCode}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <AppTextField
            label={t('dialogs.dictNameLabel')}
            placeholder={t('dialogs.dictNamePlaceholder', { target: targetLanguage, base: baseLanguage })}
            value={name}
            onChange={(e) => setName(e.target.value)}
            helperText={t('dialogs.dictNameHelper')}
            fullWidth
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1 }}>
        <AppButton
          variant="ghost"
          size="small"
          onClick={handleCancel}
          disabled={submitting}
          data-testid="create-dictionary-cancel-btn"
        >
          {t('dialogs.cancel')}
        </AppButton>
        <AppButton
          variant="primary"
          size="small"
          onClick={() => handleSubmit()}
          disabled={submitting}
          loading={submitting}
          data-tour="create-dictionary-dialog-submit"
          startIcon={<AddRoundedIcon />}
        >
          {submitting ? t('dialogs.creatingDeckBtn') : t('dialogs.createDeckBtn')}
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}
