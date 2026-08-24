import { Typography, Box, CircularProgress, List, ListItem, ListItemText, Divider } from '@mui/material';
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
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" gutterBottom>Edit Dictionary</Typography>
      
      {dictionary.length === 0 ? (
        <Typography color="text.secondary">Your dictionary is empty.</Typography>
      ) : (
        <List>
          {dictionary.map((word, index) => (
            <div key={word.id}>
              <ListItem>
                <ListItemText
                  primary={word.text}
                  secondary={`${word.definitions.length} definition(s)`}
                />
              </ListItem>
              {index < dictionary.length - 1 && <Divider />}
            </div>
          ))}
        </List>
      )}
    </Box>
  );
}
