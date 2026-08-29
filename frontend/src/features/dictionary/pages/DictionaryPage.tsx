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
      {/* Page Header */}
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          mb: 0.5,
          background: 'linear-gradient(135deg, #F3F4F6 0%, #A78BFA 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
        }}
      >
        Dictionary
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Add new words and manage your vocabulary
      </Typography>

      <AddWordForm />
      
      <WordList loading={loading} />
    </Box>
  );
}
