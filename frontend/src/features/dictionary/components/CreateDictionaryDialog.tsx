import { useState, type FormEvent } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import apiClient from '../../../shared/api/client';
import useStore, { type DictionaryItem } from '../../../store/useStore';
import { useTranslation } from '../../../shared/i18n';
import { SUPPORTED_LOCALES } from '../../../shared/i18n/types';
import { getInitialBaseLanguage, saveBaseLanguage } from '../../../shared/i18n/helpers';

interface CreateDictionaryDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (dict: DictionaryItem) => void;
}


export default function CreateDictionaryDialog({ open, onClose, onCreated }: CreateDictionaryDialogProps) {
  const { t, locale } = useTranslation();
  const [name, setName] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [baseLanguage, setBaseLanguage] = useState(() => getInitialBaseLanguage(locale));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addDictionary = useStore((state) => state.addDictionary);
  const setActiveDictionaryId = useStore((state) => state.setActiveDictionaryId);
  const setSelectedDictionaryId = useStore((state) => state.setSelectedDictionaryId);
  const setDictionary = useStore((state) => state.setDictionary);

  const handleBaseLanguageChange = (newBase: string) => {
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

      const payload = {
        name: name.trim() || undefined,
        targetLanguage,
        baseLanguage,
      };

      const res = await apiClient.post('/dictionaries', payload);
      const newDict: DictionaryItem = res.data.dictionary;

      addDictionary(newDict);
      if (newDict.isActive) {
        setActiveDictionaryId(newDict.id);
      }
      setSelectedDictionaryId(newDict.id);
      setDictionary([]); // New dictionary starts with empty words list

      if (onCreated) {
        onCreated(newDict);
      }

      handleClose();
    } catch (err: any) {
      console.error('Failed to create dictionary:', err);
      setError(err?.response?.data?.message || err?.response?.data?.error || t('dialogs.createDeckError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setError(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3.5,
            p: 1,
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 2,
              backgroundColor: '#FBE8E0',
              color: 'secondary.dark',
            }}
          >
            <AddRoundedIcon fontSize="small" />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('dialogs.createDeckTitle')}</Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t('dialogs.createDeckDesc')}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'grid', gap: 2.5 }}>
          <FormControl fullWidth>
            <InputLabel id="target-language-label">{t('dialogs.targetLangLabel')}</InputLabel>
            <Select
              labelId="target-language-label"
              value={targetLanguage}
              label={t('dialogs.targetLangLabel')}
              onChange={(e) => setTargetLanguage(e.target.value)}
            >
              {SUPPORTED_LOCALES.map((langCode) => (
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
              onChange={(e) => handleBaseLanguageChange(e.target.value)}
              inputProps={{ 'data-testid': 'dialog-native-language-select' }}
            >
              {SUPPORTED_LOCALES.map((langCode) => (
                <MenuItem key={langCode} value={langCode}>
                  {t(`languages.${langCode}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label={t('dialogs.dictNameLabel')}
            placeholder={t('dialogs.dictNamePlaceholder', { target: targetLanguage, base: baseLanguage })}
            value={name}
            onChange={(e) => setName(e.target.value)}
            helperText={t('dialogs.dictNameHelper')}
            fullWidth
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} disabled={submitting} color="inherit">
          {t('dialogs.cancel')}
        </Button>
        <Button
          onClick={() => handleSubmit()}
          variant="contained"
          color="primary"
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <AddRoundedIcon />}
        >
          {submitting ? t('dialogs.creatingDeckBtn') : t('dialogs.createDeckBtn')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
