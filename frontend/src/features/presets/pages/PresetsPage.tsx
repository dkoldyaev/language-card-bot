import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import {
  Alert,
  alpha,
  Box,
  Chip,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import apiClient from '../../../shared/api/client';
import { useTranslation } from '../../../shared/i18n';
import { SUPPORTED_LOCALES } from '../../../shared/i18n/types';
import {
  AppButton,
  AppCard,
  AppChip,
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
import type { PresetItem } from '../types';

export type { PresetItem };

export default function PresetsPage() {
  const { t } = useTranslation();

  const [presets, setPresets] = useState<PresetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');

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

  const fetchPresets = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/preset');
      setPresets(res.data.presets || []);
    } catch (err: any) {
      setError(err.response?.data?.error || t('presets.savePresetError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresets();
  }, []);

  const filteredPresets = useMemo(() => {
    if (selectedLanguage === 'all') return presets;
    return presets.filter(
      (p) => (p.for_language || p.forLanguage)?.toLowerCase() === selectedLanguage.toLowerCase()
    );
  }, [presets, selectedLanguage]);

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

    let parsedBody: any;
    try {
      parsedBody = JSON.parse(formBody);
      if (!Array.isArray(parsedBody)) {
        setFormError(t('presets.bodyArrayError'));
        return;
      }
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
    } catch (err: any) {
      setFormError(err.response?.data?.error || t('presets.savePresetError'));
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
    } catch (err: any) {
      setError(err.response?.data?.error || t('presets.deletePresetError'));
    } finally {
      setDeleting(false);
    }
  };

  const getWordCount = (body: any): number => {
    if (Array.isArray(body)) return body.length;
    return 0;
  };

  const getLangLabel = (code: string) => {
    const key = `languages.${code.toLowerCase()}`;
    const translated = t(key);
    return translated !== key ? translated : code.toUpperCase();
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
          <AppButton
            variant="primary"
            startIcon={<AddRoundedIcon />}
            onClick={handleOpenCreate}
          >
            {t('presets.createPresetBtn')}
          </AppButton>
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, minWidth: 100 }}>
            {t('presets.filterByLang')}
          </Typography>
          <Box sx={{ display: 'flex', gap: spacingTokens.element_group_gap, flexWrap: 'wrap' }}>
            <Chip
              label={t('presets.allLanguages')}
              clickable
              color={selectedLanguage === 'all' ? 'primary' : 'default'}
              variant={selectedLanguage === 'all' ? 'filled' : 'outlined'}
              onClick={() => setSelectedLanguage('all')}
              sx={{ fontWeight: 700, borderRadius: `${radiusTokens.sm}px` }}
            />
            {SUPPORTED_LOCALES.map((lang) => (
              <Chip
                key={lang}
                label={t(`languages.${lang}`)}
                clickable
                color={selectedLanguage === lang ? 'primary' : 'default'}
                variant={selectedLanguage === lang ? 'filled' : 'outlined'}
                onClick={() => setSelectedLanguage(lang)}
                sx={{ fontWeight: 700, borderRadius: `${radiusTokens.sm}px` }}
              />
            ))}
          </Box>
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
            <AppButton variant="outline" startIcon={<AddRoundedIcon />} onClick={handleOpenCreate}>
              {t('presets.createPresetBtn')}
            </AppButton>
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
            const langCode = (preset.for_language || preset.forLanguage || '').toLowerCase();
            const wordCount = getWordCount(preset.body);

            return (
              <AppCard
                key={preset.id}
                variant="interactive"
                padding="compact"
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                }}
              >
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <AppChip
                      variant="lang"
                      label={getLangLabel(langCode)}
                    />
                    <Chip
                      label={preset.type}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.75rem', fontWeight: 600, borderRadius: `${radiusTokens.sm}px` }}
                    />
                  </Box>

                  <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.3, mb: 0.5 }}>
                    {preset.title}
                  </Typography>

                  {preset.description && (
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        mb: 1.25,
                        fontSize: '0.85rem',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {preset.description}
                    </Typography>
                  )}

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('presets.containsWords', { count: wordCount })}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    pt: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    borderTop: '1px solid',
                    borderColor: 'divider',
                  }}
                >
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
                </Box>
              </AppCard>
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
                    backgroundColor: (th: any) =>
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
    </PageContainer>
  );
}
