import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  alpha,
  useTheme,
} from '@mui/material';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import apiClient from '../../../shared/api/client';
import { type DictionaryItem } from '../../../store/useStore';
import { type PresetItem, type WordDefinitionPresetItem } from '../../presets/types';

interface DictionaryPresetsProps {
  dictionary?: DictionaryItem;
  onPresetApplied?: (preset: PresetItem) => void;
}

export default function DictionaryPresets({ dictionary, onPresetApplied }: DictionaryPresetsProps) {
  const theme = useTheme();
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
        setError('Failed to load available presets.');
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

    try {
      const res = await apiClient.post('/preset/apply_preset', {
        presetId: preset.id,
        dictionaryId: dictionary.id,
      });

      const wordsCount = res.data.wordsCount ?? (Array.isArray(preset.body) ? preset.body.length : 0);
      const defsCount = res.data.definitionsCount ?? 0;
      setSuccessMessage(
        `Added "${preset.title}" to ${dictionary.name}! (${wordsCount} words, ${defsCount} definitions)`
      );

      if (onPresetApplied) {
        onPresetApplied(preset);
      }
    } catch (err: any) {
      console.error('Failed to apply preset:', err);
      setError(err.response?.data?.error || 'Failed to add preset to dictionary');
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
        borderRadius: 3,
        border: '1px solid #E5E7EB',
        backgroundColor: '#FAFAF8',
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
                borderRadius: 2.5,
                color: 'primary.dark',
                backgroundColor: alpha(theme.palette.primary.main, 0.12),
              }}
            >
              <LayersRoundedIcon fontSize="small" />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Available Presets
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
                    label={`${presets.length} ready`}
                    size="small"
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                  />
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                Curated vocabulary packs that you can add directly to this dictionary.
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
              Checking available presets for {dictionary.targetLanguage.toUpperCase()}...
            </Typography>
          </Box>
        ) : presets.length === 0 ? (
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              border: '1px dashed #D1D5DB',
              backgroundColor: '#FFFFFF',
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No presets available for {dictionary.targetLanguage.toUpperCase()} yet. You can add words manually using the form below.
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
                    borderRadius: 2.5,
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#FFFFFF',
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
                        label={`${presetWords.length} words`}
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
                            borderColor: '#E5E7EB',
                            backgroundColor: '#F9FAFB',
                          }}
                        />
                      ))}
                      {remainingCount > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', ml: 0.5 }}>
                          +{remainingCount} more
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
                      Preview words
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
                      {isApplying ? 'Adding...' : 'Add to Dictionary'}
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
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Language: <strong>{previewPreset?.for_language?.toUpperCase()}</strong> • Total words:{' '}
            <strong>{words(previewPreset?.body).length}</strong>
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
                          {item.definitions?.join('; ') || 'No definition'}
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
            Close
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
              Add this Preset
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Card>
  );
}
