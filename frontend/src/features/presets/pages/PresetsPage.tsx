import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import {
  Alert,
  alpha,
  Box,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { isAxiosError } from 'axios';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import apiClient from '../../../shared/api/client';
import { useTranslation } from '../../../shared/i18n';
import { SUPPORTED_LOCALES } from '../../../shared/i18n/types';
import {
  AppButton,
  AppCard,
  AppDialog,
  AppIconButton,
  AppTextField,
  ConfirmDialog,
  EmptyState,
  LoadingState,
  PageContainer,
  PageHeader,
  radiusTokens,
  spacingTokens,
} from '../../../shared/ui';
import useStore, { type DictionaryItem, type DictionaryWord } from '../../../store/useStore';
import AddPresetToDictionaryDialog from '../components/AddPresetToDictionaryDialog';
import PresetCard from '../components/PresetCard';
import type { PresetDefinitionItem, PresetItem, WordDefinitionPresetItem } from '../types';

export type { PresetItem };

export default function PresetsPage() {
  const { t } = useTranslation();
  const profile = useStore((state) => state.profile);
  const isAdmin = Boolean(profile?.isAdmin || profile?.is_admin);
  const dictionaries = useStore((state) => state.dictionaries);
  const token = useStore((state) => state.token);
  const setDictionary = useStore((state) => state.setDictionary);
  const currentWords = useStore((state) => state.dictionary);
  const updateDictionaryItem = useStore((state) => state.updateDictionaryItem);

  const [presets, setPresets] = useState<PresetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add-to-dictionary flow
  const [addDialogPreset, setAddDialogPreset] = useState<PresetItem | null>(null);
  const [addingToDictionaryId, setAddingToDictionaryId] = useState<number | null>(null);

  // Filter
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  // Create / Edit modal state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<PresetItem | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLanguage, setFormLanguage] = useState('es');
  const [formType, setFormType] = useState('word-definition');
  const [formBody, setFormBody] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<PresetItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    
    const fetchPresets = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiClient.get('/preset', { signal: controller.signal });
        setPresets(res.data.presets || []);
      } catch (err: unknown) {
        if (isAxiosError(err) && err.name === 'CanceledError') return;
        const message = isAxiosError<{ error?: string }>(err) ? err.response?.data?.error : undefined;
        setError(message || t('presets.savePresetError'));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchPresets();
    return () => controller.abort();
  }, [t]);

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
      if (selectedLanguage !== 'all') {
        if ((p.for_language || p.forLanguage)?.toLowerCase() !== selectedLanguage.toLowerCase()) return false;
      }
      
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
  }, [presets, selectedLanguage, selectedLevel, selectedTag]);

  const handleOpenCreate = () => {
    setEditingPreset(null);
    setFormTitle('');
    setFormDescription('');
    setFormLanguage('es');
    setFormType('word-definition');
    setFormBody('[\n  {\n    "word": "hola",\n    "definitions": ["an informal greeting"]\n  }\n]');
    setFormError(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (preset: PresetItem) => {
    setEditingPreset(preset);
    setFormTitle(preset.title);
    setFormDescription(preset.description || '');
    setFormLanguage(preset.for_language || preset.forLanguage || 'es');
    setFormType(preset.type || 'word-definition');
    setFormBody(JSON.stringify(preset.body, null, 2));
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSavePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formTitle.trim()) {
      setFormError(t('presets.titleRequiredError'));
      return;
    }

    let parsedBody: WordDefinitionPresetItem[];
    try {
      const parsed: unknown = JSON.parse(formBody);
      if (!Array.isArray(parsed)) {
        setFormError(t('presets.bodyArrayError'));
        return;
      }
      parsedBody = parsed as WordDefinitionPresetItem[];
    } catch {
      setFormError(t('presets.bodyJsonError'));
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        for_language: formLanguage,
        type: formType.trim(),
        body: parsedBody,
      };

      if (editingPreset) {
        const res = await apiClient.put(`/preset/${editingPreset.id}`, payload);
        setPresets((prev) =>
          prev.map((p) => (p.id === editingPreset.id ? res.data.preset : p))
        );
        setSuccessMessage(t('presets.presetSuccessUpdated', { title: formTitle }));
      } else {
        const res = await apiClient.post('/preset', payload);
        setPresets((prev) => [res.data.preset, ...prev]);
        setSuccessMessage(t('presets.presetSuccessCreated', { title: formTitle }));
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      const message = isAxiosError<{ error?: string }>(err) ? err.response?.data?.error : undefined;
      setFormError(message || t('presets.savePresetError'));
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDelete = (preset: PresetItem) => {
    setPresetToDelete(preset);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!presetToDelete) return;
    try {
      setDeleting(true);
      await apiClient.delete(`/preset/${presetToDelete.id}`);
      setPresets((prev) => prev.filter((p) => p.id !== presetToDelete.id));
      setSuccessMessage(t('presets.presetSuccessDeleted', { title: presetToDelete.title }));
      setDeleteConfirmOpen(false);
    } catch (err: unknown) {
      const message = isAxiosError<{ error?: string }>(err) ? err.response?.data?.error : undefined;
      setError(message || t('presets.deletePresetError'));
    } finally {
      setDeleting(false);
    }
  };

  const getLangLabel = (code: string) => {
    const key = `languages.${code.toLowerCase()}`;
    const translated = t(key);
    return translated !== key ? translated : code.toUpperCase();
  };

  /** Проверяем, есть ли хоть один совместимый словарь */
  const hasCompatibleDictionary = (preset: PresetItem) => {
    const lang = (preset.for_language || preset.forLanguage || '').toLowerCase();
    return dictionaries.some((d) => d.targetLanguage.toLowerCase() === lang);
  };

  const handleAddToDictionaryClick = (preset: PresetItem) => {
    setAddDialogPreset(preset);
  };

  const handleSelectDictionary = async (preset: PresetItem, dictionary: DictionaryItem) => {
    setAddingToDictionaryId(dictionary.id);

    try {
      if (!token) {
        // Guest mode: add locally
        let wordCounter =
          currentWords.length > 0 ? Math.max(...currentWords.map((w) => w.id)) + 1 : 1;
        let defCounter = 1;
        const presetWords = Array.isArray(preset.body) ? preset.body : [];
        const baseLang = dictionary.baseLanguage?.toLowerCase() || '';
        const newWords: DictionaryWord[] = presetWords.map((item: WordDefinitionPresetItem) => ({
          id: wordCounter++,
          text: item.word,
          definitions: (item.definitions || []).map((def: PresetDefinitionItem) => {
            const text = typeof def === 'string' ? def : def?.text || '';
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
      } else {
        await apiClient.post('/preset/apply_preset', {
          presetId: preset.id,
          dictionaryId: dictionary.id,
        });
      }

      setSuccessMessage(
        t('presets.addedSuccessDict', {
          title: preset.title,
          name: dictionary.name,
        })
      );
      setAddDialogPreset(null);
    } catch (err: unknown) {
      const message = isAxiosError<{ error?: string }>(err) ? err.response?.data?.error : undefined;
      setError(message || t('presets.failedApply'));
    } finally {
      setAddingToDictionaryId(null);
    }
  };

  return (
    <PageContainer size="wide">
      {/* Header */}
      <PageHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LayersRoundedIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <span>{t('presets.catalogTitle')}</span>
          </Box>
        }
        subtitle={t('presets.catalogDesc')}
        action={
          isAdmin ? (
            <AppButton
              variant="primary"
              startIcon={<AddRoundedIcon />}
              onClick={handleOpenCreate}
            >
              {t('presets.createPresetBtn')}
            </AppButton>
          ) : undefined
        }
      />

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: spacingTokens.element_group_gap * 2, borderRadius: `${radiusTokens.sm}px` }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: spacingTokens.element_group_gap * 2, borderRadius: `${radiusTokens.sm}px` }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Filter Bar */}
      <AppCard padding="compact" sx={{ mb: spacingTokens.section_vertical_gap }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
          <FormControl size="small">
            <InputLabel id="filter-lang-label">{t('presets.filterByLang')}</InputLabel>
            <Select
              labelId="filter-lang-label"
              value={selectedLanguage}
              label={t('presets.filterByLang')}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              sx={{ borderRadius: `${radiusTokens.sm}px` }}
            >
              <MenuItem value="all">{t('presets.allLanguages')}</MenuItem>
              {SUPPORTED_LOCALES.map((lang) => (
                <MenuItem key={lang} value={lang}>
                  {t(`languages.${lang}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small">
            <InputLabel id="filter-level-label">{t('presets.filterByLevel')}</InputLabel>
            <Select
              labelId="filter-level-label"
              value={selectedLevel}
              label={t('presets.filterByLevel')}
              onChange={(e) => setSelectedLevel(e.target.value)}
              sx={{ borderRadius: `${radiusTokens.sm}px` }}
            >
              <MenuItem value="all">{t('presets.allLevels')}</MenuItem>
              {allLevels.map((lvl) => (
                <MenuItem key={lvl} value={lvl}>{lvl}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small">
            <InputLabel id="filter-tag-label">{t('presets.filterByTag')}</InputLabel>
            <Select
              labelId="filter-tag-label"
              value={selectedTag}
              label={t('presets.filterByTag')}
              onChange={(e) => setSelectedTag(e.target.value)}
              sx={{ borderRadius: `${radiusTokens.sm}px` }}
            >
              <MenuItem value="all">{t('presets.allTags')}</MenuItem>
              {allTags.map((tag) => (
                <MenuItem key={tag} value={tag}>{tag}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </AppCard>

      {/* Presets List */}
      {loading ? (
        <LoadingState minHeight="40vh" />
      ) : filteredPresets.length === 0 ? (
        <EmptyState
          icon={<LayersRoundedIcon sx={{ fontSize: 52 }} />}
          title={t('presets.noPresetsFound')}
          description={
            selectedLanguage === 'all'
              ? t('presets.noPresetsAllDesc')
              : t('presets.noPresetsLangDesc', { lang: getLangLabel(selectedLanguage) })
          }
          action={
            isAdmin ? (
              <AppButton variant="outline" startIcon={<AddRoundedIcon />} onClick={handleOpenCreate}>
                {t('presets.createPresetBtn')}
              </AppButton>
            ) : undefined
          }
          variant="dashed"
        />
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
            gap: spacingTokens.element_group_gap * 2.5,
          }}
        >
          {filteredPresets.map((preset) => {
            const incompatible = !hasCompatibleDictionary(preset);

            return (
              <PresetCard
                key={preset.id}
                preset={preset}
                isIncompatible={incompatible}
                onAddToDictionary={handleAddToDictionaryClick}
                adminActions={
                  isAdmin ? (
                    <Box sx={{ display: 'flex', gap: spacingTokens.micro_gap }}>
                      <AppIconButton
                        size="small"
                        onClick={() => handleOpenEdit(preset)}
                        tooltip={t('presets.editPresetTooltip')}
                      >
                        <EditRoundedIcon fontSize="small" />
                      </AppIconButton>
                      <AppIconButton
                        size="small"
                        color="error"
                        onClick={() => handleOpenDelete(preset)}
                        tooltip={t('presets.deletePresetTooltip')}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </AppIconButton>
                    </Box>
                  ) : undefined
                }
              />
            );
          })}
        </Box>
      )}

      {/* Create / Edit Dialog */}
      <AppDialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        maxWidth="md"
        title={editingPreset ? t('presets.editPresetTitle') : t('presets.createPresetTitle')}
        dividers
        actions={
          <>
            <AppButton
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              {t('common.cancel')}
            </AppButton>
            <AppButton
              type="submit"
              variant="primary"
              form="preset-form"
              disabled={saving}
              loading={saving}
            >
              {editingPreset ? t('presets.saveChangesBtn') : t('presets.createPresetSubmitBtn')}
            </AppButton>
          </>
        }
      >
        <form id="preset-form" onSubmit={handleSavePreset}>
          {formError && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: `${radiusTokens.sm}px` }}>
              {formError}
            </Alert>
          )}

          <Stack spacing={2.5}>
            <AppTextField
              label={t('presets.titleLabel')}
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder={t('presets.titlePlaceholder')}
              required
              fullWidth
            />

            <AppTextField
              label={t('presets.descLabel')}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder={t('presets.descPlaceholder')}
              fullWidth
              multiline
              rows={2}
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel id="preset-lang-label">{t('languages.targetLangLabel')}</InputLabel>
                <Select
                  labelId="preset-lang-label"
                  value={formLanguage}
                  label={t('languages.targetLangLabel')}
                  onChange={(e) => setFormLanguage(e.target.value)}
                  sx={{ borderRadius: `${radiusTokens.md}px` }}
                  MenuProps={{
                    disablePortal: true,
                    transitionDuration: 0,
                  }}
                >
                  {SUPPORTED_LOCALES.map((lang) => (
                    <MenuItem key={lang} value={lang}>
                      {t(`languages.${lang}`)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id="preset-type-label">{t('presets.typeLabel')}</InputLabel>
                <Select
                  labelId="preset-type-label"
                  value={formType}
                  label={t('presets.typeLabel')}
                  readOnly
                  inputProps={{ readOnly: true }}
                  sx={{ borderRadius: `${radiusTokens.md}px` }}
                  MenuProps={{
                    disablePortal: true,
                    transitionDuration: 0,
                  }}
                >
                  <MenuItem value="word-definition">word-definition</MenuItem>
                </Select>
                <FormHelperText>{t('presets.typeHelper')}</FormHelperText>
              </FormControl>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                {t('presets.bodyLabel')}
              </Typography>
              <AppTextField
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                multiline
                rows={12}
                fullWidth
                sx={{
                  '& .MuiInputBase-root': {
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    backgroundColor: (th: Theme) =>
                      th.palette.mode === 'dark' ? alpha(th.palette.common.white, 0.04) : '#F9FAFB',
                  },
                }}
                helperText={t('presets.bodyHelperText')}
              />
            </Box>
          </Stack>
        </form>
      </AppDialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title={t('presets.confirmDeleteTitle')}
        message={t('presets.confirmDeleteMessage', { title: presetToDelete?.title || '' })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />

      {/* Add Preset to Dictionary Dialog */}
      <AddPresetToDictionaryDialog
        open={Boolean(addDialogPreset)}
        preset={addDialogPreset}
        dictionaries={dictionaries}
        addingToDictionaryId={addingToDictionaryId}
        onClose={() => setAddDialogPreset(null)}
        onSelectDictionary={handleSelectDictionary}
      />
    </PageContainer>
  );
}
