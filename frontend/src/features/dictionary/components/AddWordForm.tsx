import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { Box, Button, Card, CardContent, CircularProgress, TextField, Typography, alpha } from '@mui/material';
import { useState } from 'react';
import apiClient from '../../../shared/api/client';
import { trackEvent } from '../../../shared/lib/analytics';
import useStore from '../../../store/useStore';
import { useTranslation } from '../../../shared/i18n/I18nContext';

interface AddWordFormProps {
  dictionaryId?: number;
}

export default function AddWordForm({ dictionaryId }: AddWordFormProps = {}) {
  const { t } = useTranslation();
  const [wordsText, setWordsText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedDictionaryId = useStore((state) => state.selectedDictionaryId);
  const activeDictionaryId = useStore((state) => state.activeDictionaryId);
  const dictionaries = useStore((state) => state.dictionaries);

  const targetDictId = dictionaryId ?? selectedDictionaryId ?? activeDictionaryId ?? dictionaries[0]?.id;
  const targetDict = dictionaries.find((d) => d.id === targetDictId);

  const handleSubmitWords = async () => {
    const words = wordsText.split('\n').map((w) => w.trim()).filter(Boolean);
    if (words.length === 0) return;

    setSubmitting(true);
    try {
      for (const word of words) {
        await apiClient.post('/add_word', { word, dictionaryId: targetDictId });
        trackEvent('Word Added');
      }
      setWordsText('');
    } catch (error) {
      console.error('Failed to add words:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card sx={{ mb: 4, backgroundColor: 'background.paper' }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.75 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 2.5,
              color: 'secondary.dark',
              backgroundColor: (th) => th.palette.mode === 'dark' ? alpha(th.palette.secondary.main, 0.15) : '#FBE8E0',
            }}
          >
            <AddRoundedIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="subtitle1">
              {targetDict ? t('dictionary.addWordsToDeck', { name: targetDict.name }) : t('dictionary.addWords')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {targetDict ? t('dictionary.targetLangPrefix', { lang: targetDict.targetLanguage.toUpperCase() }) : ''}{t('dictionary.oneWordPerLine')}
            </Typography>
          </Box>
        </Box>

        <TextField
          label={t('dictionary.wordsToAddLabel')}
          multiline
          rows={4}
          fullWidth
          value={wordsText}
          onChange={(e) => setWordsText(e.target.value)}
          placeholder={t('dictionary.placeholderWords')}
          disabled={submitting}
          helperText={t('dictionary.helperText')}
          sx={{ mb: 2.25 }}
        />

        <Button
          variant="contained"
          disabled={!wordsText.trim() || submitting}
          onClick={handleSubmitWords}
          endIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <SendRoundedIcon />}
        >
          {submitting ? t('dictionary.submittingBtn') : t('dictionary.submitWordsBtn')}
        </Button>
      </CardContent>
    </Card>
  );
}
