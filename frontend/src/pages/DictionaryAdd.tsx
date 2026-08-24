import { Typography, Box, TextField, Button } from '@mui/material';
import { useState } from 'react';

export default function DictionaryAdd() {
  const [wordsText, setWordsText] = useState('');

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
      />

      <Button
        variant="contained"
        color="primary"
        fullWidth
        sx={{ mt: 2 }}
        disabled={!wordsText.trim()}
      >
        Submit Words
      </Button>
    </Box>
  );
}

