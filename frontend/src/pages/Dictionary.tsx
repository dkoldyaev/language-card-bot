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
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import useStore from '../store/useStore';

export default function Dictionary() {
  // Add words state
  const [wordsText, setWordsText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit dictionary state
  const [loading, setLoading] = useState(true);
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

  const wordProcessing = useStore((state) => state.wordProcessing);

  // Filtered dictionary
  const filteredDictionary = searchQuery
    ? dictionary.filter((w) => w.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : dictionary;

  // Words that are processing but not yet in the dictionary
  const processingOnlyWords = wordProcessing
    .filter((wp) => !dictionary.some((d) => d.text.toLowerCase() === wp.word.toLowerCase()))
    .filter((wp) => wp.status !== 'processed' && wp.status !== 'duplicate')
    .filter((wp) => (searchQuery ? wp.word.toLowerCase().includes(searchQuery.toLowerCase()) : true));

  const getProcessingChipProps = (item: any) => {
    let label = item.status;
    let icon = undefined;
    let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' = 'default';

    switch (item.status) {
      case 'processing':
        label = 'Fetching...';
        icon = <CircularProgress size={14} color="inherit" />;
        color = 'primary';
        break;
      case 'definitions_received':
        label = `Processing (${item.definitionsCount})`;
        icon = <CircularProgress size={14} color="inherit" />;
        color = 'info';
        break;
      case 'processed':
        label = `Processed ${item.processedCount}/${item.totalDefinitions}`;
        if (item.processedCount === item.totalDefinitions) {
          color = 'success';
        } else {
          icon = <CircularProgress size={14} color="inherit" />;
          color = 'info';
        }
        break;
      case 'duplicate':
        label = 'Duplicate';
        color = 'warning';
        break;
    }
    return { label, color, icon };
  };

  // ===== Add Words Logic =====
  useEffect(() => {
    apiClient.post('/switch_mode_dictionary_add');
  }, []);

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

  // ===== Edit Dictionary Logic =====
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

      {/* Add Words Section */}
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

      {/* Dictionary Section */}
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
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
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
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : filteredDictionary.length === 0 && processingOnlyWords.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 4 }}>
          <CardContent>
            <Typography color="text.secondary" sx={{ fontSize: '2rem', mb: 1 }}>
              {dictionary.length === 0 && processingOnlyWords.length === 0 ? '📚' : '🔍'}
            </Typography>
            <Typography color="text.secondary">
              {dictionary.length === 0 && processingOnlyWords.length === 0 ? 'Your dictionary is empty.' : 'No words match your search.'}
            </Typography>
            {dictionary.length === 0 && processingOnlyWords.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Add your first words above to get started!
              </Typography>
            )}
          </CardContent>
        </Card>
      ) : (
        <Box className="stagger-children">
          {processingOnlyWords.map((wp, idx) => {
            const chipProps = getProcessingChipProps(wp);
            return (
              <Box
                key={`wp-${idx}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 1.5,
                  mb: 1,
                  borderRadius: '12px',
                  border: `1px solid ${alpha('#6B7280', 0.15)}`,
                  backgroundColor: alpha('#111827', 0.5),
                }}
              >
                <Checkbox size="small" disabled sx={{ visibility: 'hidden' }} />
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 600, flexGrow: 1, color: 'text.secondary' }}
                >
                  {wp.word}
                </Typography>
                <Chip
                  size="small"
                  {...chipProps}
                  sx={{ mr: 1, fontWeight: 600, fontSize: '0.7rem' }}
                />
                <IconButton size="small" disabled sx={{ visibility: 'hidden' }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            );
          })}

          {filteredDictionary.map((word) => {
            const processingItem = wordProcessing.find(
              (wp) => wp.word.toLowerCase() === word.text.toLowerCase()
            );
            const chipProps = processingItem ? getProcessingChipProps(processingItem) : null;

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
                  {chipProps && (
                    <Chip
                      size="small"
                      {...chipProps}
                      sx={{
                        mr: 1,
                        fontWeight: 600,
                        fontSize: '0.7rem',
                      }}
                    />
                  )}
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
