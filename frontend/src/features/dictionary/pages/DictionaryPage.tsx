import { Typography, Box } from '@mui/material';
import { useEffect, useState } from 'react';
import apiClient from '../../../shared/api/client';
import useStore from '../../../store/useStore';
import AddWordForm from '../components/AddWordForm';
import WordList from '../components/WordList';

export default function DictionaryPage() {
  const [loading, setLoading] = useState(true);
  const setDictionary = useStore((state) => state.setDictionary);

  useEffect(() => {
    apiClient.get('/dictionary')
      .then((res) => {
        if (res.data.dictionary) {
          setDictionary(res.data.dictionary);
        }
      })
      .catch((error) => console.error('Failed to load dictionary:', error))
      .finally(() => setLoading(false));
  }, [setDictionary]);

  return (
    <Box className="animate-fade-in">
      <Box sx={{ mb: 3.5 }}>
        <Typography variant="overline" color="secondary.main">
          Vocabulary
        </Typography>
        <Typography variant="h1" sx={{ fontSize: { xs: '2.35rem', sm: '3rem' }, mt: 0.45 }}>
          Dictionary
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, maxWidth: 570 }}>
          Capture new words while they are useful, then keep their meanings easy to find.
        </Typography>
      </Box>

      <AddWordForm />
      
      <WordList loading={loading} />
    </Box>
  );
}
