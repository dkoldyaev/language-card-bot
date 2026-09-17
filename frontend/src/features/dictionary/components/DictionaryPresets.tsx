import AddRoundedIcon from '@mui/icons-material/AddRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  Typography,
  useTheme,
} from '@mui/material';
import { useEffect, useState } from 'react';
import apiClient from '../../../shared/api/client';
import { useTranslation } from '../../../shared/i18n';
import useStore, { type DictionaryItem, type DictionaryWord } from '../../../store/useStore';
import type { PresetItem, WordDefinitionPresetItem } from '../../presets/types';

interface DictionaryPresetsProps {
  dictionary?: DictionaryItem;
  onPresetApplied?: (preset: PresetItem) => void;
}

export default function DictionaryPresets({ dictionary, onPresetApplied }: DictionaryPresetsProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const token = useStore((state) => state.token);
  const setDictionary = useStore((state) => state.setDictionary);
  const updateDictionaryItem = useStore((state) => state.updateDictionaryItem);

  const [presets, setPresets] = useState<PresetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<number | null>(null);
  const [previewPreset, setPreviewPreset] = useState<PresetItem | null>(null);

  const targetLang = dictionary?.targetLanguage;

  useEffect(() => {
    if (!targetLang) {
      setPresets([]);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    apiClient
      .get('/preset', { params: { for_language: targetLang } })
      .then((res) => {
        if (!isMounted) return;
        setPresets(res.data.presets || []);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load presets for dictionary:', err);
        setError(t('presets.failedApply'));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [targetLang]);

  const handleApply = async (preset: PresetItem) => {
    if (!dictionary) return;

    setApplyingId(preset.id);
    setError(null);
    setSuccessMessage(null);

    if (!token) {
      try {
        const currentWords = useStore.getState().dictionary;
        let wordCounter = currentWords.length > 0 ? Math.max(...currentWords.map((w) => w.id)) + 1 : 1;
        let defCounter = 1;
        const presetWords = Array.isArray(preset.body) ? preset.body : [];
        const newWords: DictionaryWord[] = presetWords.map((item: any) => ({
          id: wordCounter++,
          text: item.word,
          definitions: (item.definitions || []).map((defText: string) => ({
            id: defCounter++,
            text: defText,
            translation: null,
            presets: [{ id: preset.id, title: preset.title }],
          })),
          presets: [{ id: preset.id, title: preset.title }],
        }));

        const updatedWords = [...currentWords, ...newWords];
        setDictionary(updatedWords);
        updateDictionaryItem(dictionary.id, { wordCount: updatedWords.length });

        setSuccessMessage(
          t('presets.addedSuccess', {
            title: preset.title,
            name: dictionary.name,
            words: newWords.length,
            defs: newWords.reduce((acc, w) => acc + w.definitions.length, 0),
          })
        );

        if (onPresetApplied) {
          onPresetApplied(preset);
        }
      } catch (err: any) {
        console.error('Failed to apply preset locally:', err);
        setError(t('presets.failedApply'));
      } finally {
        setApplyingId(null);
      }
      return;
    }

    try {
      const res = await apiClient.post('/preset/apply_preset', {
        presetId: preset.id,
        dictionaryId: dictionary.id,
      });

      const wordsCount = res.data.wordsCount ?? (Array.isArray(preset.body) ? preset.body.length : 0);
      const defsCount = res.data.definitionsCount ?? 0;
      setSuccessMessage(
        t('presets.addedSuccess', {
          title: preset.title,
          name: dictionary.name,
          words: wordsCount,
          defs: defsCount,
        })
      );

      if (onPresetApplied) {
        onPresetApplied(preset);
      }
    } catch (err: any) {
      console.error('Failed to apply preset:', err);
      setError(err.response?.data?.error || t('presets.failedApply'));
    } finally {
      setApplyingId(null);
    }
  };

  if (!dictionary) return null;

  const words = (body: any): WordDefinitionPresetItem[] => {
    return Array.isArray(body) ? body : [];
  };

  return (
    <Card
      data-testid="dictionary-presets-section"
      sx={{
        mb: 4,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: (th) => th.palette.mode === 'dark' ? alpha(th.palette.background.paper, 0.5) : '#FAFAF8',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 2,
                color: 'primary.dark',
                backgroundColor: alpha(theme.palette.primary.main, 0.12),
              }}
            >
              <LayersRoundedIcon fontSize="small" />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {t('presets.availablePresetsTitle')}
                </Typography>
                <Chip
                  label={dictionary.targetLanguage.toUpperCase()}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    color: 'primary.main',
                  }}
                />
                {!loading && presets.length > 0 && (
                  <Chip
                    label={t('presets.readyBadge', { count: presets.length })}
                    size="small"
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                  />
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                {t('presets.curatedPacksDesc')}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Notifications */}
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        {/* Presets Content */}
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              {t('presets.checkingPresets', { lang: dictionary.targetLanguage.toUpperCase() })}
            </Typography>
          </Box>
        ) : presets.length === 0 ? (
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2,
              border: '1px dashed',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {t('presets.noPresetsForDeck', { lang: dictionary.targetLanguage.toUpperCase() })}
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: presets.length > 1 ? 'repeat(2, 1fr)' : '1fr',
              },
              gap: 2,
            }}
          >
            {presets.map((preset) => {
              const presetWords = words(preset.body);
              const previewWords = presetWords.slice(0, 4);
              const remainingCount = presetWords.length - previewWords.length;
              const isApplying = applyingId === preset.id;

              return (
                <Card
                  key={preset.id}
                  data-testid={`preset-card-${preset.id}`}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: 'background.paper',
                    boxShadow: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    p: 2,
                    transition: 'all 0.15s ease-in-out',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                    },
                  }}
                >
                  <Box sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.75 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
                        {preset.title}
                      </Typography>
                      <Chip
                        label={t('dictionary.wordsCount', { count: presetWords.length })}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: alpha(theme.palette.primary.main, 0.08),
                          color: 'primary.main',
                        }}
                      />
                    </Box>

                    {preset.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          fontSize: '0.8rem',
                          mb: 1,
                          lineHeight: 1.35,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {preset.description}
                      </Typography>
                    )}

                    {/* Word Chips Preview */}
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1 }}>
                      {previewWords.map((item, idx) => (
                        <Chip
                          key={idx}
                          label={item.word}
                          size="small"
                          variant="outlined"
                          sx={{
                            height: 22,
                            fontSize: '0.72rem',
                            borderColor: 'divider',
                            backgroundColor: (th) => th.palette.mode === 'dark' ? alpha(th.palette.common.white, 0.04) : '#F9FAFB',
                          }}
                        />
                      ))}
                      {remainingCount > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', ml: 0.5 }}>
                          {t('presets.moreWords', { count: remainingCount })}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Actions */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      pt: 1.5,
                      borderTop: '1px solid #F3F4F6',
                      gap: 1,
                    }}
                  >
                    <Button
                      size="small"
                      startIcon={<VisibilityRoundedIcon sx={{ fontSize: 16 }} />}
                      onClick={() => setPreviewPreset(preset)}
                      sx={{
                        textTransform: 'none',
                        color: 'text.secondary',
                        fontSize: '0.8rem',
                        '&:hover': { color: 'primary.main' },
                      }}
                    >
                      {t('presets.previewWordsBtn')}
                    </Button>

                    <Button
                      variant="contained"
                      size="small"
                      startIcon={isApplying ? <CircularProgress size={16} color="inherit" /> : <AddRoundedIcon />}
                      disabled={isApplying || applyingId !== null}
                      onClick={() => handleApply(preset)}
                      data-testid={`apply-preset-btn-${preset.id}`}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: 2,
                        px: 1.75,
                      }}
                    >
                      {isApplying ? t('presets.addingToDeckBtn') : t('presets.addToDeckBtn')}
                    </Button>
                  </Box>
                </Card>
              );
            })}
          </Box>
        )}
      </CardContent>

      {/* Preset Preview Dialog */}
      <Dialog
        open={Boolean(previewPreset)}
        onClose={() => setPreviewPreset(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          {previewPreset?.title}
          {previewPreset?.description && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, fontStyle: 'italic' }}>
              {previewPreset.description}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('presets.previewLangInfo', {
              lang: previewPreset?.for_language?.toUpperCase() || '',
              count: words(previewPreset?.body).length,
            })}
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <List sx={{ py: 0 }}>
            {previewPreset &&
              words(previewPreset.body).map((item, idx) => (
                <Box key={idx}>
                  <ListItem sx={{ py: 1.25, px: 3 }}>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {item.word}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                          {item.definitions?.join('; ') || t('presets.noDefinitions')}
                        </Typography>
                      }
                    />
                  </ListItem>
                  {idx < words(previewPreset.body).length - 1 && <Divider />}
                </Box>
              ))}
          </List>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setPreviewPreset(null)} sx={{ textTransform: 'none' }}>
            {t('presets.closeBtn')}
          </Button>
          {previewPreset && (
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => {
                const p = previewPreset;
                setPreviewPreset(null);
                handleApply(p);
              }}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              {t('presets.addThisPresetBtn')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Card>
  );
}
