import { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Stack,
  alpha,
  useTheme,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import apiClient from '../../../shared/api/client';
import useStore from '../../../store/useStore';

const COMMON_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'ru', label: 'Russian' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'tr', label: 'Turkish' },
];

export interface PresetItem {
  id: number;
  title: string;
  for_language: string;
  forLanguage?: string;
  type: string;
  body: any;
  createdAt: string;
  updatedAt: string;
}

export default function PresetsPage() {
  const theme = useTheme();
  const dictionaries = useStore((state) => state.dictionaries);

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
  const [formLanguage, setFormLanguage] = useState('es');
  const [formType, setFormType] = useState('word-definition');
  const [formBody, setFormBody] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Apply modal state
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [presetToApply, setPresetToApply] = useState<PresetItem | null>(null);
  const [targetDictionaryId, setTargetDictionaryId] = useState<number | ''>('');
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

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
      setError(err.response?.data?.error || 'Failed to load presets');
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
    setFormLanguage('es');
    setFormType('word-definition');
    setFormBody('[\n  {\n    "word": "hola",\n    "definitions": ["an informal greeting"]\n  }\n]');
    setFormError(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (preset: PresetItem) => {
    setEditingPreset(preset);
    setFormTitle(preset.title);
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
      setFormError('Title is required');
      return;
    }

    let parsedBody: any;
    try {
      parsedBody = JSON.parse(formBody);
      if (!Array.isArray(parsedBody)) {
        setFormError('Body must be a JSON array of words');
        return;
      }
    } catch {
      setFormError('Invalid JSON format in body');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: formTitle.trim(),
        for_language: formLanguage,
        type: formType.trim(),
        body: parsedBody,
      };

      if (editingPreset) {
        const res = await apiClient.put(`/preset/${editingPreset.id}`, payload);
        setPresets((prev) =>
          prev.map((p) => (p.id === editingPreset.id ? res.data.preset : p))
        );
        setSuccessMessage(`Preset "${formTitle}" updated successfully.`);
      } else {
        const res = await apiClient.post('/preset', payload);
        setPresets((prev) => [res.data.preset, ...prev]);
        setSuccessMessage(`Preset "${formTitle}" created successfully.`);
      }
      setDialogOpen(false);
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to save preset');
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
      setSuccessMessage(`Preset "${presetToDelete.title}" deleted.`);
      setDeleteConfirmOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete preset');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenApply = (preset: PresetItem) => {
    setPresetToApply(preset);
    setApplyError(null);
    const lang = (preset.for_language || preset.forLanguage || '').toLowerCase();
    const matchingDict = dictionaries.find((d) => d.targetLanguage.toLowerCase() === lang);
    setTargetDictionaryId(matchingDict?.id ?? (dictionaries[0]?.id ?? ''));
    setApplyDialogOpen(true);
  };

  const handleApply = async () => {
    if (!presetToApply || !targetDictionaryId) {
      setApplyError('Please select a dictionary');
      return;
    }

    try {
      setApplying(true);
      setApplyError(null);
      const res = await apiClient.post('/preset/apply_preset', {
        presetId: presetToApply.id,
        dictionaryId: Number(targetDictionaryId),
      });

      setSuccessMessage(
        `Applied "${presetToApply.title}"! Added ${res.data.wordsCount ?? 0} words and ${res.data.definitionsCount ?? 0} definitions.`
      );
      setApplyDialogOpen(false);
    } catch (err: any) {
      setApplyError(err.response?.data?.error || 'Failed to apply preset');
    } finally {
      setApplying(false);
    }
  };

  const getWordCount = (body: any): number => {
    if (Array.isArray(body)) return body.length;
    return 0;
  };

  const getLangLabel = (code: string) => {
    const item = COMMON_LANGUAGES.find((l) => l.code === code.toLowerCase());
    return item ? `${item.label} (${code.toUpperCase()})` : code.toUpperCase();
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
              Presets Catalog
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Pre-built vocabulary packs ready to be applied directly into user dictionaries.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={handleOpenCreate}
          sx={{
            borderRadius: 3,
            px: 2.5,
            py: 1.1,
            fontWeight: 700,
            textTransform: 'none',
            boxShadow: '0 4px 14px rgba(22, 101, 52, 0.25)',
          }}
        >
          Create Preset
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
          borderRadius: 3,
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, minWidth: 100 }}>
          Filter by language:
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label="All Languages"
            clickable
            color={selectedLanguage === 'all' ? 'primary' : 'default'}
            variant={selectedLanguage === 'all' ? 'filled' : 'outlined'}
            onClick={() => setSelectedLanguage('all')}
            sx={{ fontWeight: 600 }}
          />
          {COMMON_LANGUAGES.map((lang) => (
            <Chip
              key={lang.code}
              label={lang.label}
              clickable
              color={selectedLanguage === lang.code ? 'primary' : 'default'}
              variant={selectedLanguage === lang.code ? 'filled' : 'outlined'}
              onClick={() => setSelectedLanguage(lang.code)}
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
            backgroundColor: '#FFFFFF',
            borderRadius: 3,
            border: '1px dashed #D1D5DB',
          }}
        >
          <LayersRoundedIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            No presets found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {selectedLanguage === 'all'
              ? 'Get started by creating your first vocabulary preset.'
              : `No presets available for ${getLangLabel(selectedLanguage)}.`}
          </Typography>
          <Button variant="outlined" startIcon={<AddRoundedIcon />} onClick={handleOpenCreate}>
            Create Preset
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
                    borderRadius: 3,
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

                    <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.3, mb: 1 }}>
                      {preset.title}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Contains <strong>{wordCount}</strong> words with definitions.
                    </Typography>
                  </CardContent>

                  <Box
                    sx={{
                      p: 2,
                      pt: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid #F3F4F6',
                    }}
                  >
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<PlayArrowRoundedIcon />}
                      onClick={() => handleOpenApply(preset)}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: 2,
                      }}
                    >
                      Apply to Dict
                    </Button>

                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Edit Preset">
                        <IconButton size="small" onClick={() => handleOpenEdit(preset)}>
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Preset">
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
            {editingPreset ? 'Edit Preset' : 'Create New Preset'}
          </DialogTitle>
          <DialogContent dividers>
            {formError && (
              <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
                {formError}
              </Alert>
            )}

            <Stack spacing={2.5}>
              <TextField
                label="Title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. 50 Essential Spanish Verbs"
                required
                fullWidth
              />

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel id="preset-lang-label">Target Language</InputLabel>
                  <Select
                    labelId="preset-lang-label"
                    value={formLanguage}
                    label="Target Language"
                    onChange={(e) => setFormLanguage(e.target.value)}
                  >
                    {COMMON_LANGUAGES.map((lang) => (
                      <MenuItem key={lang.code} value={lang.code}>
                        {lang.label} ({lang.code.toUpperCase()})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Type"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  required
                  fullWidth
                  helperText="Current supported type: word-definition"
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Preset Body (JSON)
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
                      backgroundColor: '#F9FAFB',
                    },
                  }}
                  helperText='Array of objects with "word" and "definitions" (translations are fetched automatically).'
                />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setDialogOpen(false)} disabled={saving} sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              sx={{ textTransform: 'none', fontWeight: 700, minWidth: 100 }}
            >
              {saving ? <CircularProgress size={20} color="inherit" /> : editingPreset ? 'Save Changes' : 'Create Preset'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Apply Preset Dialog */}
      <Dialog open={applyDialogOpen} onClose={() => !applying && setApplyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Apply Preset to Dictionary
        </DialogTitle>
        <DialogContent dividers>
          {applyError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {applyError}
            </Alert>
          )}

          {presetToApply && (
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {presetToApply.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Language: <strong>{getLangLabel(presetToApply.for_language || presetToApply.forLanguage || '')}</strong>
              </Typography>
            </Box>
          )}

          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel id="select-dict-label">Select Target Dictionary</InputLabel>
            <Select
              labelId="select-dict-label"
              value={targetDictionaryId}
              label="Select Target Dictionary"
              onChange={(e) => setTargetDictionaryId(Number(e.target.value))}
            >
              {dictionaries.map((dict) => (
                <MenuItem key={dict.id} value={dict.id}>
                  {dict.name} ({dict.targetLanguage.toUpperCase()} → {dict.baseLanguage.toUpperCase()})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setApplyDialogOpen(false)} disabled={applying} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleApply}
            disabled={applying || !targetDictionaryId}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {applying ? <CircularProgress size={20} color="inherit" /> : 'Apply Preset'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => !deleting && setDeleteConfirmOpen(false)}>
        <DialogTitle sx={{ fontWeight: 800 }}>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete the preset <strong>{presetToDelete?.title}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleting} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {deleting ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
