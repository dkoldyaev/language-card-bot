import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  alpha,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  Modal,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type React from 'react';
import { useEffect, useState } from 'react';
import apiClient from '../../../shared/api/client';
import StatusChip from '../../../shared/components/StatusChip';
import { useTranslation } from '../../../shared/i18n';
import { trackEvent } from '../../../shared/lib/analytics';
import {
  AppButton,
  AppChip,
  AppSearchInput,
  colorTokens,
  EmptyState,
  LoadingState,
  radiusTokens,
  spacingTokens,
} from '../../../shared/ui';
import useStore from '../../../store/useStore';

export default function WordList({ loading }: { loading: boolean }) {
  const { t } = useTranslation();
  const [editingDefId, setEditingDefId] = useState<number | null>(null);
  const [editingTransId, setEditingTransId] = useState<number | null>(null);
  const [editDefText, setEditDefText] = useState('');
  const [editTransText, setEditTransText] = useState('');
  const [selectedWordIds, setSelectedWordIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const token = useStore((state) => state.token);
  const dictionary = useStore((state) => state.dictionary);
  const setDictionary = useStore((state) => state.setDictionary);
  const removeDictionaryWord = useStore((state) => state.removeDictionaryWord);
  const updateDictionaryDefinition = useStore((state) => state.updateDictionaryDefinition);
  const updateDictionaryTranslation = useStore((state) => state.updateDictionaryTranslation);
  const addDictionaryDefinition = useStore((state) => state.addDictionaryDefinition);
  const removeDictionaryDefinition = useStore((state) => state.removeDictionaryDefinition);
  const removeDefinitionImage = useStore((state) => state.removeDefinitionImage);

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
        if (token) {
          await apiClient.delete(`/word_delete/${wordId}`);
        }
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
      filteredDictionary.forEach((w) => {newSelected.add(w.id)});
    } else {
      filteredDictionary.forEach((w) => {newSelected.delete(w.id)});
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
        if (token) {
          await apiClient.post('/word_delete/bulk', { wordIds: Array.from(selectedWordIds) });
        }
        trackEvent('Word Deleted', { count: selectedWordIds.size });
        const remaining = dictionary.filter((w) => !selectedWordIds.has(w.id));
        setDictionary(remaining);
        setSelectedWordIds(new Set());
      } catch (error) {
        console.error('Failed to bulk delete words:', error);
      }
    }
  };

  const handleEditDefinition = async (wordId: number, defId: number) => {
    try {
      if (token) {
        await apiClient.put(`/definition_edit/${defId}`, { text: editDefText });
      }
      updateDictionaryDefinition(wordId, defId, editDefText);
      setEditingDefId(null);
    } catch (error) {
      console.error('Failed to edit definition:', error);
    }
  };

  const handleEditTranslation = async (wordId: number, defId: number) => {
    try {
      if (token) {
        await apiClient.put(`/definition_translate_edit/${defId}`, { text: editTransText });
      }
      updateDictionaryTranslation(wordId, defId, editTransText);
      setEditingTransId(null);
    } catch (error) {
      console.error('Failed to edit translation:', error);
    }
  };

  const handleAddDefinition = async (wordId: number) => {
    const text = window.prompt(t('dictionary.enterNewDefinitionPrompt'));
    if (text?.trim()) {
      try {
        let defId = Date.now();
        if (token) {
          const res = await apiClient.post('/definition_add', { wordId, text: text.trim() });
          defId = res.data.definitionId;
        }
        addDictionaryDefinition(wordId, { id: defId, text: text.trim(), translation: null });
      } catch (error) {
        console.error('Failed to add definition:', error);
      }
    }
  };

  const handleDeleteDefinition = async (wordId: number, defId: number) => {
    if (window.confirm(t('dictionary.deleteDefConfirm'))) {
      try {
        if (token) {
          await apiClient.delete(`/definition_delete/${defId}`);
        }
        removeDictionaryDefinition(wordId, defId);
      } catch (error) {
        console.error('Failed to delete definition:', error);
      }
    }
  };

  const handleDeleteImage = async (wordId: number, defId: number, imageId: number) => {
    if (window.confirm(t('dictionary.deleteImageConfirm', { defaultValue: 'Are you sure you want to delete this image?' }))) {
      try {
        if (token) {
          await apiClient.delete(`/image/${defId}/${imageId}`);
        }
        removeDefinitionImage(wordId, defId, imageId);
      } catch (error) {
        console.error('Failed to delete image:', error);
      }
    }
  };

  return (
    <Box sx={{ mb: spacingTokens.section_vertical_gap }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: spacingTokens.element_group_gap * 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          {t('dictionary.yourWords')}
        </Typography>
        {dictionary.length > 0 && (
          <Chip
            label={dictionary.length}
            size="small"
            sx={{
              borderRadius: `${radiusTokens.sm}px`,
              backgroundColor: (th) =>
                th.palette.mode === 'dark' ? alpha(th.palette.primary.main, 0.2) : '#E7EEF9',
              color: (th) =>
                th.palette.mode === 'dark' ? th.palette.primary.light : 'primary.dark',
              fontWeight: 800,
              fontSize: '0.75rem',
            }}
          />
        )}
      </Box>

      {/* Search + Bulk Actions */}
      {dictionary.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            gap: spacingTokens.element_group_gap * 2,
            mb: spacingTokens.element_group_gap * 2,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <AppSearchInput
              placeholder={t('dictionary.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              fullWidth
            />
          </Box>
          <Box sx={{ display: 'flex', gap: spacingTokens.element_group_gap * 1.5, alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isAllFilteredSelected}
                  indeterminate={isFilteredIndeterminate}
                  disabled={filteredDictionary.length === 0}
                  onChange={handleSelectAll}
                  size="small"
                  slotProps={{
                    input: {
                      'data-indeterminate': isFilteredIndeterminate ? 'true' : 'false',
                    } as React.InputHTMLAttributes<HTMLInputElement>,
                  }}
                />
              }
              label={<Typography variant="body2" sx={{ fontWeight: 600 }}>{t('dictionary.selectAll')}</Typography>}
              sx={{ mr: 0 }}
            />
            {selectedWordIds.size > 0 && (
              <AppButton
                variant="outline"
                size="small"
                startIcon={<DeleteIcon fontSize="small" />}
                onClick={handleBulkDelete}
                sx={{
                  color: 'error.main',
                  borderColor: 'error.main',
                  '&:hover': {
                    backgroundColor: alpha(colorTokens.learningStatus.attention.color, 0.08),
                    borderColor: 'error.dark',
                  },
                }}
              >
                {t('dictionary.bulkDeleteBtn', { count: selectedWordIds.size })}
              </AppButton>
            )}
          </Box>
        </Box>
      )}

      {loading ? (
        <LoadingState minHeight="30vh" />
      ) : filteredDictionary.length === 0 ? (
        <EmptyState
          icon={dictionary.length === 0 ? '📚' : '🔍'}
          title={dictionary.length === 0 ? t('dictionary.emptyDeckMessage') : t('dictionary.emptySearchMessage')}
          description={dictionary.length === 0 ? t('dictionary.emptyDeckPrompt') : undefined}
          variant="dashed"
        />
      ) : (
        <Box className="stagger-children" sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {filteredDictionary.map((word) => {
            return (
              <Accordion
                key={word.id}
                sx={{
                  borderRadius: `${radiusTokens.lg}px !important`,
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: 'none',
                  overflow: 'hidden',
                  '&::before': { display: 'none' },
                }}
              >
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
                        fontWeight: 800,
                        color: 'text.primary',
                        mr: 1.5,
                      }}
                    >
                      {word.text}
                    </Typography>

                    {word.presets && word.presets.length > 0 && (
                      <Box sx={{ display: 'inline-flex', gap: 0.5, mr: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                        {word.presets.map((preset) => (
                          <Tooltip key={preset.id} title={`Preset: ${preset.title}`}>
                            <Box component="span" data-testid={`word-preset-chip-${preset.id}`}>
                              <AppChip
                                variant="preset"
                                label={preset.title}
                                sx={{
                                  maxWidth: { xs: 90, sm: 140 },
                                  '& .MuiChip-label': {
                                    px: 0.75,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  },
                                }}
                              />
                            </Box>
                          </Tooltip>
                        ))}
                      </Box>
                    )}

                    <Box sx={{ flexGrow: 1 }} />
                    <StatusChip word={word.text} isProcessing={word.isProcessing} />
                    <Chip
                      label={t('dictionary.definitionCount', { count: word.definitions.length })}
                      size="small"
                      sx={{
                        mr: 1,
                        display: { xs: 'none', sm: 'inline-flex' },
                        borderRadius: `${radiusTokens.sm}px`,
                        backgroundColor: (th) =>
                          th.palette.mode === 'dark' ? alpha(th.palette.success.main, 0.15) : '#E8F3F1',
                        color: (th) => (th.palette.mode === 'dark' ? th.palette.success.main : '#15554F'),
                        fontWeight: 700,
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
                <AccordionDetails sx={{ pt: 0, px: 2.5, pb: 2.5 }}>
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
                          <Button size="small" onClick={() => setEditingDefId(null)}>
                            {t('common.cancel')}
                          </Button>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
                          <Typography variant="body1" sx={{ fontWeight: 700 }}>
                            {idx + 1}. {typeof def.text === 'string' ? def.text : (def.text as { text?: string })?.text || ''}
                          </Typography>
                          {def.presets && def.presets.length > 0 && (
                            <Box sx={{ display: 'inline-flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                              {def.presets.map((preset) => (
                                <Tooltip key={preset.id} title={`Preset: ${preset.title}`}>
                                  <Box component="span" data-testid={`def-preset-chip-${preset.id}`}>
                                    <AppChip
                                      variant="preset"
                                      label={preset.title}
                                      sx={{
                                        maxWidth: 120,
                                        '& .MuiChip-label': {
                                          px: 0.6,
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                        },
                                      }}
                                    />
                                  </Box>
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
                          <Button size="small" onClick={() => setEditingTransId(null)}>
                            {t('common.cancel')}
                          </Button>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', ml: 2, mt: 0.5 }}>
                          {def.translation ? (
                            <>
                              <Typography variant="body2" color="text.secondary">
                                {t('dictionary.translationPrefix', {
                                  text: typeof def.translation === 'string' ? def.translation : def.translation?.text || '',
                                })}
                              </Typography>
                              <IconButton
                                size="small"
                                aria-label={t('dictionary.editTranslationTooltip')}
                                onClick={() => {
                                  setEditingTransId(def.id);
                                  setEditTransText(typeof def.translation === 'string' ? def.translation : def.translation?.text || '');
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
                              sx={{ textTransform: 'none', borderRadius: `${radiusTokens.sm}px` }}
                            >
                              {t('dictionary.addTranslationBtn')}
                            </Button>
                          )}
                        </Box>
                      )}

                      {def.images && def.images.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 1.5, ml: 2, mt: 1.5, flexWrap: 'wrap' }}>
                          {def.images.map((img) => (
                            <Box key={img.id} sx={{ position: 'relative', display: 'inline-flex' }}>
                              <Box
                                component="img"
                                src={img.url}
                                alt="preview"
                                sx={{
                                  width: 64,
                                  height: 64,
                                  objectFit: 'cover',
                                  borderRadius: `${radiusTokens.md}px`,
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  cursor: 'pointer',
                                }}
                                onClick={() => setSelectedImageUrl(img.url)}
                              />
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteImage(word.id, def.id, img.id)}
                                sx={{
                                  position: 'absolute',
                                  top: -8,
                                  right: -8,
                                  width: 20,
                                  height: 20,
                                  bgcolor: 'background.paper',
                                  boxShadow: 1,
                                  '&:hover': {
                                    bgcolor: 'error.lighter',
                                  },
                                  zIndex: 1,
                                }}
                              >
                                <DeleteIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Box>
                          ))}
                        </Box>
                      )}

                      {idx < word.definitions.length - 1 && <Divider sx={{ mt: 2 }} />}
                    </Box>
                  ))}
                  <Box sx={{ mt: 2 }}>
                    <AppButton
                      variant="outline"
                      size="small"
                      onClick={() => handleAddDefinition(word.id)}
                      startIcon={<AddRoundedIcon />}
                    >
                      {t('dictionary.addDefinitionBtn')}
                    </AppButton>
                  </Box>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}

      <Modal
        open={!!selectedImageUrl}
        onClose={() => setSelectedImageUrl(null)}
        aria-labelledby="image-modal"
        aria-describedby="image-modal-description"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            outline: 'none',
            maxWidth: '100%',
            maxHeight: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setSelectedImageUrl(null)}
        >
          {selectedImageUrl && (
            <Box
              component="img"
              src={selectedImageUrl}
              alt="Expanded view"
              sx={{
                maxWidth: '100%',
                maxHeight: '90vh',
                objectFit: 'contain',
                borderRadius: `${radiusTokens.md}px`,
                boxShadow: 24,
                bgcolor: 'background.paper',
              }}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </Box>
      </Modal>
    </Box>
  );
}
