import { Typography, Box, CircularProgress, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import useStore from '../store/useStore';

export default function DictionaryEdit() {
  const [loading, setLoading] = useState(true);
  const dictionary = useStore((state) => state.dictionary);
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" gutterBottom>Edit Dictionary</Typography>
      
      {dictionary.length === 0 ? (
        <Typography color="text.secondary">Your dictionary is empty.</Typography>
      ) : (
        <div>
          {dictionary.map((word) => (
            <Accordion key={word.id}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ width: '33%', flexShrink: 0 }}>
                  {word.text}
                </Typography>
                <Typography sx={{ color: 'text.secondary' }}>
                  {word.definitions.length} definition(s)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {word.definitions.map((def, idx) => (
                  <Box key={def.id} sx={{ mb: idx !== word.definitions.length - 1 ? 2 : 0 }}>
                    <Typography variant="body1" fontWeight="bold">
                      {idx + 1}. {def.text}
                    </Typography>
                    {def.translation && (
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 2, mt: 0.5 }}>
                        Translation: {def.translation.text}
                      </Typography>
                    )}
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          ))}
        </div>
      )}
    </Box>
  );
}
