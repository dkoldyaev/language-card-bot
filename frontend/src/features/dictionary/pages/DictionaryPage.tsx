import { Typography, Box, Chip, alpha } from '@mui/material';
import { useEffect, useState } from 'react';
import apiClient from '../../../shared/api/client';
import useStore from '../../../store/useStore';
import AddWordForm from '../components/AddWordForm';
import WordList from '../components/WordList';

export default function DictionaryPage() {
  const [loading, setLoading] = useState(true);
  const setDictionary = useStore((state) => state.setDictionary);
  const activeDictionaryId = useStore((state) => state.activeDictionaryId);
  const dictionaries = useStore((state) => state.dictionaries);

  const activeDict = dictionaries.find((d) => d.id === activeDictionaryId) || dictionaries[0];

  useEffect(() => {
    setLoading(true);
    apiClient.get('/dictionary')
      .then((res) => {
        if (res.data.dictionary) {
          setDictionary(res.data.dictionary);
        }
      })
      .catch((error) => console.error('Failed to load dictionary:', error))
      .finally(() => setLoading(false));
  }, [setDictionary, activeDictionaryId]);

  return (
    <Box className="animate-fade-in">
      <Box sx={{ mb: 3.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Typography variant="overline" color="secondary.main">
            Vocabulary Deck
          </Typography>
          {activeDict && (
            <Chip
              label={`${activeDict.targetLanguage.toUpperCase()} → ${activeDict.baseLanguage.toUpperCase()}`}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.72rem',
                fontWeight: 700,
                backgroundColor: alpha('#2453A6', 0.1),
                color: 'primary.dark',
              }}
            />
          )}
        </Box>
        <Typography variant="h1" sx={{ fontSize: { xs: '2.35rem', sm: '3rem' }, mt: 0.45 }}>
          {activeDict ? activeDict.name : 'Dictionary'}
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, maxWidth: 620 }}>
          {activeDict
            ? `Learning ${activeDict.targetLanguage.toUpperCase()} with definitions and translations in ${activeDict.baseLanguage.toUpperCase()}.`
            : 'Capture new words while they are useful, then keep their meanings easy to find.'}
        </Typography>
      </Box>

      <AddWordForm />
      
      <WordList loading={loading} />
    </Box>
  );
}
