import { useState } from 'react';
import {
  Typography, Box, TextField, Button, CircularProgress,
  Accordion, AccordionSummary, AccordionDetails,
  IconButton, Checkbox, FormControlLabel, Card, CardContent,
  Chip, alpha, InputAdornment, Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import apiClient from '../../../shared/api/client';
import useStore from '../../../store/useStore';
import StatusChip from '../../../shared/components/StatusChip';

export default function WordList({ loading }: { loading: boolean }) {
  const [editingDefId, setEditingDefId] = useState<number | null>(null);
  const [editingTransId, setEditingTransId] = useState<number | null>(null);
  const [editDefText, setEditDefText] = useState('');
  const [editTransText, setEditTransText] = useState('');
  const [selectedWordIds, setSelectedWordIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const dictionary = useStore((state) => state.dictionary);
  const setDictionary = useStore((state) => state.setDictionary);
  const removeDictionaryWord = useStore((state) => state.removeDictionaryWord);
  const updateDictionaryDefinition = useStore((state) => state.updateDictionaryDefinition);
  const updateDictionaryTranslation = useStore((state) => state.updateDictionaryTranslation);
  const addDictionaryDefinition = useStore((state) => state.addDictionaryDefinition);
  const removeDictionaryDefinition = useStore((state) => state.removeDictionaryDefinition);

  const filteredDictionary = searchQuery
    ? dictionary.filter((w) => w.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : dictionary;

  const handleDelete = async (e: React.MouseEvent, wordId: number, text: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${text}"?`)) {
      try {
        await apiClient.delete(`/word_delete/${wordId}`);
        removeDictionaryWord(wordId);
        if (selectedWordIds.has(wordId)) {
          const newSelected = new Set(selectedWordIds);
          newSelected.delete(wordId);
          setSelectedWordIds(newSelected);
        }
      } catch (error) {
        console.error('Failed to delete word:', error);
      }
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedWordIds(new Set(dictionary.map(w => w.id)));
    } else {
      setSelectedWordIds(new Set());
    }
  };

  const handleSelectWord = (e: React.ChangeEvent<HTMLInputElement>, wordId: number) => {
    const newSelected = new Set(selectedWordIds);
    if (e.target.checked) {
      newSelected.add(wordId);
    } else {
      newSelected.delete(wordId);
    }
    setSelectedWordIds(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedWordIds.size === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedWordIds.size} word(s)?`)) {
      try {
        await apiClient.post('/word_delete/bulk', { wordIds: Array.from(selectedWordIds) });
        const remaining = dictionary.filter(w => !selectedWordIds.has(w.id));
        setDictionary(remaining);
        setSelectedWordIds(new Set());
      } catch (error) {
        console.error('Failed to bulk delete words:', error);
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

  const handleAddDefinition = async (wordId: number) => {
    const text = window.prompt('Enter new definition:');
    if (text && text.trim()) {
      try {
        const res = await apiClient.post('/definition_add', { wordId, text: text.trim() });
        addDictionaryDefinition(wordId, { id: res.data.definitionId, text: text.trim(), translation: null });
      } catch (error) {
        console.error('Failed to add definition:', error);
      }
    }
  };

  const handleDeleteDefinition = async (wordId: number, defId: number) => {
    if (window.confirm('Are you sure you want to delete this definition?')) {
      try {
        await apiClient.delete(`/definition_delete/${defId}`);
        removeDictionaryDefinition(wordId, defId);
      } catch (error) {
        console.error('Failed to delete definition:', error);
      }
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        Your Words
        {dictionary.length > 0 && (
          <Chip
            label={dictionary.length}
            size="small"
            sx={{
              ml: 1.5,
              backgroundColor: alpha('#7C3AED', 0.15),
              color: '#A78BFA',
              fontWeight: 700,
              fontSize: '0.75rem',
            }}
          />
        )}
      </Typography>

      {/* Search + Bulk Actions */}
      {dictionary.length > 0 && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search words..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ flex: 1, minWidth: 200 }}
          />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={dictionary.length > 0 && selectedWordIds.size === dictionary.length}
                  indeterminate={selectedWordIds.size > 0 && selectedWordIds.size < dictionary.length}
                  onChange={handleSelectAll}
                  size="small"
                />
              }
              label={<Typography variant="body2">All</Typography>}
              sx={{ mr: 0 }}
            />
            {selectedWordIds.size > 0 && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteIcon />}
                onClick={handleBulkDelete}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Delete ({selectedWordIds.size})
              </Button>
            )}
          </Box>
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : filteredDictionary.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 4 }}>
          <CardContent>
            <Typography color="text.secondary" sx={{ fontSize: '2rem', mb: 1 }}>
              {dictionary.length === 0 ? '📚' : '🔍'}
            </Typography>
            <Typography color="text.secondary">
              {dictionary.length === 0 ? 'Your dictionary is empty.' : 'No words match your search.'}
            </Typography>
            {dictionary.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Add your first words above to get started!
              </Typography>
            )}
          </CardContent>
        </Card>
      ) : (
        <Box className="stagger-children">
          {filteredDictionary.map((word) => {
            return (
              <Accordion key={word.id}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                  <Checkbox
                    checked={selectedWordIds.has(word.id)}
                    onChange={(e) => handleSelectWord(e, word.id)}
                    onClick={(e) => e.stopPropagation()}
                    size="small"
                  />
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 600,
                      flexGrow: 1,
                      color: 'text.primary',
                    }}
                  >
                    {word.text}
                  </Typography>
                  <StatusChip word={word.text} />
                  <Chip
                    label={`${word.definitions.length} definition(s)`}
                    size="small"
                    sx={{
                      mr: 1,
                      backgroundColor: alpha('#06B6D4', 0.12),
                      color: '#22D3EE',
                      fontWeight: 600,
                      fontSize: '0.7rem',
                    }}
                  />
                  <IconButton
                    component="span"
                    size="small"
                    color="error"
                    onClick={(e) => handleDelete(e, word.id, word.text)}
                    aria-label={`Delete ${word.text}`}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {word.definitions.map((def, idx) => (
                  <Box key={def.id} sx={{ mb: idx !== word.definitions.length - 1 ? 2 : 0 }}>
                    {editingDefId === def.id ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                        <TextField
                          size="small"
                          value={editDefText}
                          onChange={(e) => setEditDefText(e.target.value)}
                          sx={{ flexGrow: 1 }}
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
                        {/* @ts-ignore */}
                        <Typography variant="body1" fontWeight="bold">
                          {idx + 1}. {def.text}
                        </Typography>
                        <IconButton
                          size="small"
                          aria-label="Edit definition"
                          onClick={() => {
                            setEditingDefId(def.id);
                            setEditDefText(def.text);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteDefinition(word.id, def.id)}
                          aria-label="Delete definition"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )}

                    {editingTransId === def.id ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', ml: 2, mt: 0.5, gap: 1 }}>
                        <TextField
                          size="small"
                          value={editTransText}
                          onChange={(e) => setEditTransText(e.target.value)}
                          sx={{ flexGrow: 1 }}
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
                              aria-label="Edit translation"
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

                    {idx < word.definitions.length - 1 && (
                      <Divider sx={{ mt: 2, borderColor: alpha('#6B7280', 0.1) }} />
                    )}
                  </Box>
                ))}
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleAddDefinition(word.id)}
                    startIcon={<AddRoundedIcon />}
                  >
                    Add Definition
                  </Button>
                </Box>
              </AccordionDetails>
            </Accordion>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
