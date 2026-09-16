import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
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
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import apiClient from '../../../shared/api/client';
import { useTranslation } from '../../../shared/i18n';
import { SUPPORTED_LOCALES } from '../../../shared/i18n/types';
import type { PresetItem } from '../types';

export type { PresetItem };

export default function PresetsPage() {
  const { t } = useTranslation();
  const theme = useTheme();

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
    <Box sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
          mb: 3.5,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5 }}>
            <LayersRoundedIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>
              {t('presets.catalogTitle')}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {t('presets.catalogDesc')}
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={handleOpenCreate}
          sx={{
            px: 2.5,
            py: 1.1,
            fontWeight: 700,
            textTransform: 'none',
            boxShadow: '0 4px 14px rgba(22, 101, 52, 0.25)',
          }}
        >
          {t('presets.createPresetBtn')}
        </Button>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Filter Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: 3,
          p: 2,
          borderRadius: 2,
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, minWidth: 100 }}>
          {t('presets.filterByLang')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={t('presets.allLanguages')}
            clickable
            color={selectedLanguage === 'all' ? 'primary' : 'default'}
            variant={selectedLanguage === 'all' ? 'filled' : 'outlined'}
            onClick={() => setSelectedLanguage('all')}
            sx={{ fontWeight: 600 }}
          />
          {SUPPORTED_LOCALES.map((lang) => (
            <Chip
              key={lang}
              label={t(`languages.${lang}`)}
              clickable
              color={selectedLanguage === lang ? 'primary' : 'default'}
              variant={selectedLanguage === lang ? 'filled' : 'outlined'}
              onClick={() => setSelectedLanguage(lang)}
              sx={{ fontWeight: 600 }}
            />
          ))}
        </Box>
      </Box>

      {/* Presets List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredPresets.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 3,
            backgroundColor: 'background.paper',
            borderRadius: 2,
            border: '1px dashed',
            borderColor: 'divider',
          }}
        >
          <LayersRoundedIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            {t('presets.noPresetsFound')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {selectedLanguage === 'all'
              ? t('presets.noPresetsAllDesc')
              : t('presets.noPresetsLangDesc', { lang: getLangLabel(selectedLanguage) })}
          </Typography>
          <Button variant="outlined" startIcon={<AddRoundedIcon />} onClick={handleOpenCreate}>
            {t('presets.createPresetBtn')}
          </Button>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
            gap: 2.5,
          }}
        >
          {filteredPresets.map((preset) => {
            const langCode = (preset.for_language || preset.forLanguage || '').toLowerCase();
            const wordCount = getWordCount(preset.body);

            return (
              <Box key={preset.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Chip
                        label={getLangLabel(langCode)}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          backgroundColor: alpha(theme.palette.primary.main, 0.12),
                          color: theme.palette.primary.main,
                          borderRadius: 2,
                        }}
                      />
                      <Chip
                        label={preset.type}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem', fontWeight: 600 }}
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
                  </CardContent>

                  <Box
                    sx={{
                      p: 2,
                      pt: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      borderTop: '1px solid #F3F4F6',
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title={t('presets.editPresetTooltip')}>
                        <IconButton size="small" onClick={() => handleOpenEdit(preset)}>
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('presets.deletePresetTooltip')}>
                        <IconButton size="small" color="error" onClick={() => handleOpenDelete(preset)}>
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Card>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleSavePreset}>
          <DialogTitle sx={{ fontWeight: 800 }}>
            {editingPreset ? t('presets.editPresetTitle') : t('presets.createPresetTitle')}
          </DialogTitle>
          <DialogContent dividers>
            {formError && (
              <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
                {formError}
              </Alert>
            )}

            <Stack spacing={2.5}>
              <TextField
                label={t('presets.titleLabel')}
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={t('presets.titlePlaceholder')}
                required
                fullWidth
              />

              <TextField
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
                  >
                    <MenuItem value="word-definition">word-definition</MenuItem>
                  </Select>
                  <FormHelperText>{t('presets.typeHelper')}</FormHelperText>
                </FormControl>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  {t('presets.bodyLabel')}
                </Typography>
                <TextField
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  multiline
                  rows={12}
                  fullWidth
                  sx={{
                    '& .MuiInputBase-root': {
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      backgroundColor: (th) => th.palette.mode === 'dark' ? alpha(th.palette.common.white, 0.04) : '#F9FAFB',
                    },
                  }}
                  helperText={t('presets.bodyHelperText')}
                />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setDialogOpen(false)} disabled={saving} sx={{ textTransform: 'none' }}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              sx={{ textTransform: 'none', fontWeight: 700, minWidth: 100 }}
            >
              {saving ? <CircularProgress size={20} color="inherit" /> : editingPreset ? t('presets.saveChangesBtn') : t('presets.createPresetSubmitBtn')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => !deleting && setDeleteConfirmOpen(false)}>
        <DialogTitle sx={{ fontWeight: 800 }}>{t('presets.confirmDeleteTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            {t('presets.confirmDeleteMessage', { title: presetToDelete?.title || '' })}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleting} sx={{ textTransform: 'none' }}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {deleting ? <CircularProgress size={20} color="inherit" /> : t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
