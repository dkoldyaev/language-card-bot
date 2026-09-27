import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import {
  Alert,
  alpha,
  Box,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  useTheme,
} from '@mui/material';
import { isAxiosError } from 'axios';
import { useMemo, useState } from 'react';
import apiClient from '../../../shared/api/client';
import { useTranslation } from '../../../shared/i18n';
import useStore, { type DictionaryItem, type DictionaryWord } from '../../../store/useStore';
import { useGuidelineStore } from '../../guideline';
import PresetCard from '../../presets/components/PresetCard';
import type { PresetDefinitionItem, PresetItem, WordDefinitionPresetItem } from '../../presets/types';

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

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<number | null>(null);

  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  const currentWords = useStore((state) => state.dictionary);
  const storePresets = useStore((state) => state.presets);

  const targetLang = dictionary?.targetLanguage;

  const presets = useMemo(() => {
    if (!targetLang) return [];
    return storePresets.filter((p: PresetItem) => (p.for_language || p.forLanguage)?.toLowerCase() === targetLang.toLowerCase());
  }, [storePresets, targetLang]);

  const { allTags, allLevels } = useMemo(() => {
    const tags = new Set<string>();
    const levels = new Set<string>();
    presets.forEach(p => {
      if (Array.isArray(p.body)) {
        p.body.forEach((item: WordDefinitionPresetItem) => {
          if (Array.isArray(item.definitions)) {
            item.definitions.forEach((def: PresetDefinitionItem) => {
              if (def && typeof def === 'object') {
                if (Array.isArray(def.tags)) def.tags.forEach((t: string) => {tags.add(t.toLowerCase())});
                if (Array.isArray(def.levels)) def.levels.forEach((l: string) => {levels.add(l.toUpperCase())});
              }
            });
          }
        });
      }
    });
    return {
      allTags: Array.from(tags).sort(),
      allLevels: Array.from(levels).sort(),
    };
  }, [presets]);

  const filteredPresets = useMemo(() => {
    return presets.filter(p => {
      const pTags = new Set<string>();
      const pLevels = new Set<string>();
      if (Array.isArray(p.body)) {
        p.body.forEach((item: WordDefinitionPresetItem) => {
          if (Array.isArray(item.definitions)) {
            item.definitions.forEach((def: PresetDefinitionItem) => {
              if (def && typeof def === 'object') {
                if (Array.isArray(def.tags)) def.tags.forEach((t: string) => {pTags.add(t.toLowerCase())});
                if (Array.isArray(def.levels)) def.levels.forEach((l: string) => {pLevels.add(l.toUpperCase())});
              }
            });
          }
        });
      }

      if (selectedLevel !== 'all' && !pLevels.has(selectedLevel.toUpperCase())) return false;
      if (selectedTag !== 'all' && !pTags.has(selectedTag.toLowerCase())) return false;

      return true;
    });
  }, [presets, selectedLevel, selectedTag]);

  const handleApply = async (preset: PresetItem) => {
    if (!dictionary) return;

    setApplyingId(preset.id);
    setError(null);
    setSuccessMessage(null);

    if (!token) {
      try {
        let wordCounter = currentWords.length > 0 ? Math.max(...currentWords.map((w) => w.id)) + 1 : 1;
        let defCounter = 1;
        const presetWords = Array.isArray(preset.body) ? preset.body : [];
        const baseLang = dictionary?.baseLanguage?.toLowerCase() || '';
        const newWords: DictionaryWord[] = presetWords.map((item: WordDefinitionPresetItem) => ({
          id: wordCounter++,
          text: item.word,
          definitions: (item.definitions || []).map((def: PresetDefinitionItem) => {
            const text = typeof def === 'string' ? def : (def?.text || '');
            const transText =
              typeof def === 'object' && def?.translations && baseLang
                ? def.translations[baseLang] || null
                : typeof def === 'object' && typeof def?.translation === 'string'
                ? def.translation
                : null;
            return {
              id: defCounter++,
              text,
              translation: transText ? { id: defCounter++, text: transText } : null,
              presets: [{ id: preset.id, title: preset.title }],
            };
          }),
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
        useGuidelineStore.getState().advanceStep('step3_select_preset');
      } catch (err: unknown) {
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
      useGuidelineStore.getState().advanceStep('step3_select_preset');
    } catch (err: unknown) {
      console.error('Failed to apply preset:', err);
      const message = isAxiosError<{ error?: string }>(err) ? err.response?.data?.error : undefined;
      setError(message || t('presets.failedApply'));
    } finally {
      setApplyingId(null);
    }
  };

  if (!dictionary) return null;

  const words = (body: PresetItem['body']): WordDefinitionPresetItem[] => {
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
                borderRadius: '50%',
                color: 'primary.dark',
                backgroundColor: alpha(theme.palette.primary.main, 0.12),
              }}
            >
              <LayersRoundedIcon fontSize="small" />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
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
                {presets.length > 0 && (
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

        {presets.length > 0 && (
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="dict-filter-level-label">{t('presets.filterByLevel')}</InputLabel>
              <Select
                labelId="dict-filter-level-label"
                value={selectedLevel}
                label={t('presets.filterByLevel')}
                onChange={(e) => setSelectedLevel(e.target.value)}
                sx={{ borderRadius: 1 }}
              >
                <MenuItem value="all">{t('presets.allLevels')}</MenuItem>
                {allLevels.map((lvl) => (
                  <MenuItem key={lvl} value={lvl}>{lvl}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="dict-filter-tag-label">{t('presets.filterByTag')}</InputLabel>
              <Select
                labelId="dict-filter-tag-label"
                value={selectedTag}
                label={t('presets.filterByTag')}
                onChange={(e) => setSelectedTag(e.target.value)}
                sx={{ borderRadius: 1 }}
              >
                <MenuItem value="all">{t('presets.allTags')}</MenuItem>
                {allTags.map((tag) => (
                  <MenuItem key={tag} value={tag}>{tag}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

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
        {presets.length === 0 ? (
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
            {filteredPresets.map((preset) => {
              const presetWords = words(preset.body);
              const isApplying = applyingId === preset.id;
              const isAlreadyInDictionary =
                presetWords.length > 0 &&
                presetWords.every((pw) =>
                  currentWords.some((cw) => cw.text.toLowerCase() === pw.word.toLowerCase())
                );

              return (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  onAddToCurrentDictionary={handleApply}
                  isAdding={isApplying}
                  isAlreadyInDictionary={isAlreadyInDictionary}
                />
              );
            })}
          </Box>
        )}
      </CardContent>

    </Card>
  );
}
