import { Typography, Box, TextField, Button, CircularProgress } from '@mui/material';
import { useState } from 'react';
import apiClient from '../api/client';
import WordProcessingList from '../components/WordProcessingList';

export default function DictionaryAdd() {
  const [wordsText, setWordsText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const words = wordsText.split('\n').map((w) => w.trim()).filter(Boolean);
    if (words.length === 0) return;

    setSubmitting(true);
    try {
      // Switch mode to DICTIONARY_ADD first just in case
      await apiClient.post('/state/mode', { mode: 'DICTIONARY_ADD' });
      
      for (const word of words) {
        await apiClient.post('/add_word', { word });
      }
      setWordsText('');
    } catch (error) {
      console.error('Failed to add words:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" gutterBottom>Add Words</Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Enter words to add to your dictionary, one per line.
      </Typography>

      <TextField
        label="Words list"
        multiline
        rows={10}
        fullWidth
        value={wordsText}
        onChange={(e) => setWordsText(e.target.value)}
        margin="normal"
        placeholder="apple\nbanana\ncherry"
        disabled={submitting}
      />

      <Button
        variant="contained"
        color="primary"
        fullWidth
        sx={{ mt: 2 }}
        disabled={!wordsText.trim() || submitting}
        onClick={handleSubmit}
      >
        {submitting ? <CircularProgress size={24} /> : 'Submit Words'}
      </Button>

      <WordProcessingList />
    </Box>
  );
}

