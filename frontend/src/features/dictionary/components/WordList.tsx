import { useState, useEffect } from 'react';
import {
  Typography, Box, TextField, Button, CircularProgress,
  Accordion, AccordionSummary, AccordionDetails,
  IconButton, Checkbox, FormControlLabel, Card, CardContent,
  Chip, InputAdornment, Divider, Tooltip, alpha,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import apiClient from '../../../shared/api/client';
import useStore from '../../../store/useStore';
import StatusChip from '../../../shared/components/StatusChip';
import { trackEvent } from '../../../shared/lib/analytics';
import { useTranslation } from '../../../shared/i18n';

export default function WordList({ loading }: { loading: boolean }) {
  const { t } = useTranslation();
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

  const filteredSelectedCount = filteredDictionary.filter((w) => selectedWordIds.has(w.id)).length;
  const isAllFilteredSelected = filteredDictionary.length > 0 && filteredSelectedCount === filteredDictionary.length;
  const isFilteredIndeterminate = filteredSelectedCount > 0 && filteredSelectedCount < filteredDictionary.length;

  useEffect(() => {
    setSelectedWordIds((prev) => {
      const valid = new Set([...prev].filter((id) => dictionary.some((w) => w.id === id)));
      return valid.size === prev.size ? prev : valid;
    });
  }, [dictionary]);

  const handleDelete = async (e: React.MouseEvent, wordId: number, text: string) => {
    e.stopPropagation();
    if (window.confirm(t('dictionary.deleteWordConfirm', { text }))) {
      try {
        await apiClient.delete(`/word_delete/${wordId}`);
        trackEvent('Word Deleted');
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
    const newSelected = new Set(selectedWordIds);
    if (e.target.checked) {
      filteredDictionary.forEach((w) => newSelected.add(w.id));
    } else {
      filteredDictionary.forEach((w) => newSelected.delete(w.id));
    }
    setSelectedWordIds(newSelected);
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
    if (window.confirm(t('dictionary.bulkDeleteConfirm', { count: selectedWordIds.size }))) {
      try {
        await apiClient.post('/word_delete/bulk', { wordIds: Array.from(selectedWordIds) });
        trackEvent('Word Deleted', { count: selectedWordIds.size });
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
    const text = window.prompt(t('dictionary.enterNewDefinitionPrompt'));
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
    if (window.confirm(t('dictionary.deleteDefConfirm'))) {
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
      <Typography variant="h5" sx={{ mb: 1.75 }}>
        {t('dictionary.yourWords')}
        {dictionary.length > 0 && (
          <Chip
            label={dictionary.length}
            size="small"
            sx={{
              ml: 1.5,
              backgroundColor: '#E7EEF9',
              color: 'primary.dark',
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
            placeholder={t('dictionary.searchPlaceholder')}
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
                  checked={isAllFilteredSelected}
                  indeterminate={isFilteredIndeterminate}
                  disabled={filteredDictionary.length === 0}
                  onChange={handleSelectAll}
                  size="small"
                />
              }
              label={<Typography variant="body2">{t('dictionary.selectAll')}</Typography>}
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
                {t('dictionary.bulkDeleteBtn', { count: selectedWordIds.size })}
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
              {dictionary.length === 0 ? t('dictionary.emptyDeckMessage') : t('dictionary.emptySearchMessage')}
            </Typography>
            {dictionary.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {t('dictionary.emptyDeckPrompt')}
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
                <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', minWidth: 0 }}>
                  <Checkbox
                    checked={selectedWordIds.has(word.id)}
                    onChange={(e) => handleSelectWord(e, word.id)}
                    onClick={(e) => e.stopPropagation()}
                    size="small"
                  />
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 700,
                      color: 'text.primary',
                      mr: 1,
                    }}
                  >
                    {word.text}
                  </Typography>

                  {word.presets && word.presets.length > 0 && (
                    <Box sx={{ display: 'inline-flex', gap: 0.5, mr: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                      {word.presets.map((preset) => (
                        <Tooltip key={preset.id} title={`Preset: ${preset.title}`}>
                          <Chip
                            data-testid={`word-preset-chip-${preset.id}`}
                            label={preset.title}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              backgroundColor: alpha('#7C3AED', 0.1),
                              color: '#6D28D9',
                              border: '1px solid',
                              borderColor: alpha('#7C3AED', 0.25),
                              borderRadius: 1.5,
                              maxWidth: { xs: 90, sm: 140 },
                              '& .MuiChip-label': {
                                px: 0.75,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              },
                            }}
                          />
                        </Tooltip>
                      ))}
                    </Box>
                  )}

                  <Box sx={{ flexGrow: 1 }} />
                  <StatusChip word={word.text} />
                  <Chip
                    label={t('dictionary.definitionCount', { count: word.definitions.length })}
                    size="small"
                    sx={{
                      mr: 1,
                      display: { xs: 'none', sm: 'inline-flex' },
                      backgroundColor: '#E8F3F1',
                      color: '#15554F',
                      fontWeight: 600,
                      fontSize: '0.7rem',
                    }}
                  />
                  <IconButton
                    component="span"
                    size="small"
                    color="error"
                    onClick={(e) => handleDelete(e, word.id, word.text)}
                    aria-label={t('dictionary.deleteWordTooltip', { word: word.text })}
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
                          {t('common.save')}
                        </Button>
                        <Button
                          size="small"
                          onClick={() => setEditingDefId(null)}
                        >
                          {t('common.cancel')}
                        </Button>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>
                          {idx + 1}. {def.text}
                        </Typography>
                        {def.presets && def.presets.length > 0 && (
                          <Box sx={{ display: 'inline-flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                            {def.presets.map((preset) => (
                              <Tooltip key={preset.id} title={`Preset: ${preset.title}`}>
                                <Chip
                                  data-testid={`def-preset-chip-${preset.id}`}
                                  label={preset.title}
                                  size="small"
                                  sx={{
                                    height: 18,
                                    fontSize: '0.62rem',
                                    fontWeight: 600,
                                    backgroundColor: alpha('#7C3AED', 0.08),
                                    color: '#6D28D9',
                                    border: '1px solid',
                                    borderColor: alpha('#7C3AED', 0.2),
                                    borderRadius: 1.5,
                                    maxWidth: 120,
                                    '& .MuiChip-label': {
                                      px: 0.6,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    },
                                  }}
                                />
                              </Tooltip>
                            ))}
                          </Box>
                        )}
                        <IconButton
                          size="small"
                          aria-label={t('dictionary.editDefinitionTooltip')}
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
                          aria-label={t('dictionary.deleteDefinitionTooltip')}
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
                          {t('common.save')}
                        </Button>
                        <Button
                          size="small"
                          onClick={() => setEditingTransId(null)}
                        >
                          {t('common.cancel')}
                        </Button>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', ml: 2, mt: 0.5 }}>
                        {def.translation ? (
                          <>
                            <Typography variant="body2" color="text.secondary">
                              {t('dictionary.translationPrefix', { text: def.translation.text })}
                            </Typography>
                            <IconButton
                              size="small"
                              aria-label={t('dictionary.editTranslationTooltip')}
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
                            {t('dictionary.addTranslationBtn')}
                          </Button>
                        )}
                      </Box>
                    )}

                    {idx < word.definitions.length - 1 && (
                      <Divider sx={{ mt: 2 }} />
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
                    {t('dictionary.addDefinitionBtn')}
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
