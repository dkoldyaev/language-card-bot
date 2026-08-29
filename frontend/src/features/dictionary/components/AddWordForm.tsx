import { useState } from 'react';
import { Box, TextField, Button, CircularProgress, Typography, Card, CardContent } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import apiClient from '../../../shared/api/client';

export default function AddWordForm() {
  const [wordsText, setWordsText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitWords = async () => {
    const words = wordsText.split('\n').map((w) => w.trim()).filter(Boolean);
    if (words.length === 0) return;

    setSubmitting(true);
    try {
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
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AddRoundedIcon sx={{ color: 'primary.light', fontSize: 20 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Add Words
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter words to add to your dictionary, one per line.
        </Typography>

        <TextField
          label="Words list"
          multiline
          rows={4}
          fullWidth
          value={wordsText}
          onChange={(e) => setWordsText(e.target.value)}
          placeholder={"apple\nbanana\ncherry"}
          disabled={submitting}
          sx={{ mb: 2 }}
        />

        <Button
          variant="contained"
          fullWidth
          disabled={!wordsText.trim() || submitting}
          onClick={handleSubmitWords}
          endIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <SendRoundedIcon />}
          sx={{
            py: 1.3,
            background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
            '&:hover': {
              background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
            },
          }}
        >
          {submitting ? 'Submitting...' : 'Submit Words'}
        </Button>
      </CardContent>
    </Card>
  );
}
