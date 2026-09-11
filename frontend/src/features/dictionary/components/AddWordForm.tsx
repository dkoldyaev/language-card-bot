import { useState } from 'react';
import { Box, TextField, Button, CircularProgress, Typography, Card, CardContent } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import apiClient from '../../../shared/api/client';
import { trackEvent } from '../../../shared/lib/analytics';

import useStore from '../../../store/useStore';

interface AddWordFormProps {
  dictionaryId?: number;
}

export default function AddWordForm({ dictionaryId }: AddWordFormProps = {}) {
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
    <Card sx={{ mb: 4, backgroundColor: '#FFFDF9' }}>
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
              backgroundColor: '#FBE8E0',
            }}
          >
            <AddRoundedIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="subtitle1">
              Add words{targetDict ? ` to ${targetDict.name}` : ''}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {targetDict ? `Target language: ${targetDict.targetLanguage.toUpperCase()} • ` : ''}One word per line works best.
            </Typography>
          </Box>
        </Box>

        <TextField
          label="Words to add"
          multiline
          rows={4}
          fullWidth
          value={wordsText}
          onChange={(e) => setWordsText(e.target.value)}
          placeholder={"apple\nbanana\ncherry"}
          disabled={submitting}
          helperText="We will create a card for every line."
          sx={{ mb: 2.25 }}
        />

        <Button
          variant="contained"
          disabled={!wordsText.trim() || submitting}
          onClick={handleSubmitWords}
          endIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <SendRoundedIcon />}
        >
          {submitting ? 'Submitting...' : 'Submit Words'}
        </Button>
      </CardContent>
    </Card>
  );
}
