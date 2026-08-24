import { Typography, Box, CircularProgress, Accordion, AccordionSummary, AccordionDetails, IconButton, TextField, Button } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import useStore from '../store/useStore';

export default function DictionaryEdit() {
  const [loading, setLoading] = useState(true);
  const [editingDefId, setEditingDefId] = useState<number | null>(null);
  const [editingTransId, setEditingTransId] = useState<number | null>(null);
  const [editDefText, setEditDefText] = useState('');
  const [editTransText, setEditTransText] = useState('');

  const dictionary = useStore((state) => state.dictionary);
  const setDictionary = useStore((state) => state.setDictionary);
  const removeDictionaryWord = useStore((state) => state.removeDictionaryWord);
  const updateDictionaryDefinition = useStore((state) => state.updateDictionaryDefinition);
  const updateDictionaryTranslation = useStore((state) => state.updateDictionaryTranslation);

  const handleDelete = async (e: React.MouseEvent, wordId: number, text: string) => {
    e.stopPropagation(); // Prevent accordion from toggling
    if (window.confirm(`Are you sure you want to delete "${text}"?`)) {
      try {
        await apiClient.delete(`/word_delete/${wordId}`);
        removeDictionaryWord(wordId);
      } catch (error) {
        console.error('Failed to delete word:', error);
      }
    }
  };

  const handleEditDefinition = async (wordId: number, defId: number) => {
    try {
      await apiClient.put(`/definition_edit/${defId}`, { text: editDefText });
      updateDictionaryDefinition(wordId, defId, editDefText);
      setEditingDefId(null);
    } catch (error) {
      console.error('Failed to edit definition:', error);
    }
  };

  const handleEditTranslation = async (wordId: number, defId: number) => {
    try {
      await apiClient.put(`/definition_translate_edit/${defId}`, { text: editTransText });
      updateDictionaryTranslation(wordId, defId, editTransText);
      setEditingTransId(null);
    } catch (error) {
      console.error('Failed to edit translation:', error);
    }
  };

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
                <Box sx={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                  <Typography variant="subtitle1" sx={{ width: '33%', flexShrink: 0 }}>
                    {word.text}
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', flexGrow: 1 }}>
                    {word.definitions.length} definition(s)
                  </Typography>
                  <IconButton 
                    component="span"
                    size="small" 
                    color="error" 
                    onClick={(e) => handleDelete(e, word.id, word.text)}
                    aria-label={`Delete ${word.text}`}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {word.definitions.map((def, idx) => (
                  <Box key={def.id} sx={{ mb: idx !== word.definitions.length - 1 ? 2 : 0 }}>
                    {editingDefId === def.id ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <TextField
                          size="small"
                          value={editDefText}
                          onChange={(e) => setEditDefText(e.target.value)}
                          sx={{ flexGrow: 1, mr: 1 }}
                        />
                        <Button 
                          variant="contained" 
                          size="small" 
                          onClick={() => handleEditDefinition(word.id, def.id)}
                        >
                          Save
                        </Button>
                        <Button 
                          size="small" 
                          onClick={() => setEditingDefId(null)}
                        >
                          Cancel
                        </Button>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body1" fontWeight="bold">
                          {idx + 1}. {def.text}
                        </Typography>
                        <IconButton 
                          size="small" 
                          onClick={() => {
                            setEditingDefId(def.id);
                            setEditDefText(def.text);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )}

                    {editingTransId === def.id ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', ml: 2, mt: 0.5 }}>
                        <TextField
                          size="small"
                          value={editTransText}
                          onChange={(e) => setEditTransText(e.target.value)}
                          sx={{ flexGrow: 1, mr: 1 }}
                        />
                        <Button 
                          variant="contained" 
                          size="small" 
                          onClick={() => handleEditTranslation(word.id, def.id)}
                        >
                          Save
                        </Button>
                        <Button 
                          size="small" 
                          onClick={() => setEditingTransId(null)}
                        >
                          Cancel
                        </Button>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', ml: 2, mt: 0.5 }}>
                        {def.translation ? (
                          <>
                            <Typography variant="body2" color="text.secondary">
                              Translation: {def.translation.text}
                            </Typography>
                            <IconButton 
                              size="small" 
                              onClick={() => {
                                setEditingTransId(def.id);
                                setEditTransText(def.translation?.text || '');
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </>
                        ) : (
                          <Button 
                            size="small" 
                            variant="outlined" 
                            onClick={() => {
                              setEditingTransId(def.id);
                              setEditTransText('');
                            }}
                          >
                            Add Translation
                          </Button>
                        )}
                      </Box>
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
