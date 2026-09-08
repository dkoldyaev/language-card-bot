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

interface CreateDictionaryDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (dict: DictionaryItem) => void;
}

const COMMON_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'ru', label: 'Russian' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'tr', label: 'Turkish' },
];

export default function CreateDictionaryDialog({ open, onClose, onCreated }: CreateDictionaryDialogProps) {
  const [name, setName] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [baseLanguage, setBaseLanguage] = useState('en');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addDictionary = useStore((state) => state.addDictionary);
  const setActiveDictionaryId = useStore((state) => state.setActiveDictionaryId);
  const setDictionary = useStore((state) => state.setDictionary);

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!targetLanguage || !baseLanguage) {
      setError('Please select both target and native languages');
      return;
    }

    if (targetLanguage === baseLanguage) {
      setError('Target language and native language must be different');
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
      setActiveDictionaryId(newDict.id);
      setDictionary([]); // New dictionary starts with empty words list

      if (onCreated) {
        onCreated(newDict);
      }

      handleClose();
    } catch (err: any) {
      console.error('Failed to create dictionary:', err);
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Failed to create dictionary');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setTargetLanguage('es');
    setBaseLanguage('en');
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
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Create New Dictionary</Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Set up a separate vocabulary deck. You can learn any language using any native reference language.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'grid', gap: 2.5 }}>
          <FormControl fullWidth>
            <InputLabel id="target-language-label">Language to Learn (Target)</InputLabel>
            <Select
              labelId="target-language-label"
              value={targetLanguage}
              label="Language to Learn (Target)"
              onChange={(e) => setTargetLanguage(e.target.value)}
            >
              {COMMON_LANGUAGES.map((lang) => (
                <MenuItem key={lang.code} value={lang.code}>
                  {lang.label} ({lang.code.toUpperCase()})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="base-language-label">Explanations / Native Language</InputLabel>
            <Select
              labelId="base-language-label"
              value={baseLanguage}
              label="Explanations / Native Language"
              onChange={(e) => setBaseLanguage(e.target.value)}
            >
              {COMMON_LANGUAGES.map((lang) => (
                <MenuItem key={lang.code} value={lang.code}>
                  {lang.label} ({lang.code.toUpperCase()})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Dictionary Name (optional)"
            placeholder={`${targetLanguage.toUpperCase()} (${baseLanguage.toUpperCase()})`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            helperText="e.g. Spanish for Travel, Business French, or leave blank for default"
            fullWidth
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} disabled={submitting} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={() => handleSubmit()}
          variant="contained"
          color="primary"
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <AddRoundedIcon />}
        >
          {submitting ? 'Creating...' : 'Create Dictionary'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
