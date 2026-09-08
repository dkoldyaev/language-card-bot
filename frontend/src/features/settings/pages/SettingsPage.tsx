import {
  Alert, Box, Button, Card, CardContent, CircularProgress, FormControl, InputLabel,
  MenuItem, Select, Typography, Chip, IconButton, Tooltip, alpha,
} from '@mui/material';
import { useEffect, useState } from 'react';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import apiClient from '../../../shared/api/client';
import useStore from '../../../store/useStore';
import { trackEvent } from '../../../shared/lib/analytics';
import CreateDictionaryDialog from '../../dictionary/components/CreateDictionaryDialog';

export default function Settings() {
  const settings = useStore((state) => state.settings);
  const setSettings = useStore((state) => state.setSettings);
  const dictionaries = useStore((state) => state.dictionaries);
  const activeDictionaryId = useStore((state) => state.activeDictionaryId);
  const setDictionaries = useStore((state) => state.setDictionaries);
  const setActiveDictionaryId = useStore((state) => state.setActiveDictionaryId);
  const removeDictionary = useStore((state) => state.removeDictionary);
  const setDictionary = useStore((state) => state.setDictionary);

  const [baseLanguage, setBaseLanguage] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (settings) {
      setBaseLanguage(settings.baseLanguage || '');
      setTargetLanguage(settings.targetLanguage || '');
    }
    setLoading(false);
  }, [settings]);

  const handleSaveActiveLanguages = () => {
    setSaving(true);
    setSuccess(false);
    apiClient.post('/settings', { baseLanguage, targetLanguage })
      .then(() => {
        trackEvent('Settings Updated');
        setSettings({ baseLanguage, targetLanguage });
        setSuccess(true);
        // Refresh dictionaries
        apiClient.get('/dictionaries').then((res) => {
          if (res.data.dictionaries) setDictionaries(res.data.dictionaries);
        });
        setTimeout(() => setSuccess(false), 3000);
      })
      .catch((error) => console.error('Failed to save settings', error))
      .finally(() => setSaving(false));
  };

  const handleSelectDictionary = async (dictId: number) => {
    try {
      await apiClient.post(`/dictionaries/${dictId}/select`);
      setActiveDictionaryId(dictId);
      const res = await apiClient.get('/dictionary');
      if (res.data.dictionary) {
        setDictionary(res.data.dictionary);
      }
    } catch (err) {
      console.error('Failed to select dictionary:', err);
    }
  };

  const handleDeleteDictionary = async (dictId: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" and all its words?`)) {
      return;
    }

    try {
      await apiClient.delete(`/dictionaries/${dictId}`);
      removeDictionary(dictId);
      // Reload dictionaries and words
      const dictsRes = await apiClient.get('/dictionaries');
      if (dictsRes.data.dictionaries) {
        setDictionaries(dictsRes.data.dictionaries);
        if (dictsRes.data.activeDictionaryId) {
          setActiveDictionaryId(dictsRes.data.activeDictionaryId);
        }
      }
      const wordsRes = await apiClient.get('/dictionary');
      if (wordsRes.data.dictionary) {
        setDictionary(wordsRes.data.dictionary);
      }
    } catch (err) {
      console.error('Failed to delete dictionary:', err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="animate-fade-in" sx={{ maxWidth: 760 }}>
      <Box sx={{ mb: 3.5 }}>
        <Typography variant="overline" color="secondary.main">Learning setup</Typography>
        <Typography variant="h1" sx={{ fontSize: { xs: '2.35rem', sm: '3rem' }, mt: 0.45 }}>
          Settings & Dictionaries
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 580 }}>
          Manage your language decks and configure native reference languages for your words and definitions.
        </Typography>
      </Box>

      {/* Dictionaries List Card */}
      <Card sx={{ mb: 3.5 }}>
        <CardContent sx={{ p: { xs: 2.25, sm: 3.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 2.5,
                  color: 'primary.main',
                  backgroundColor: alpha('#2453A6', 0.1),
                }}
              >
                <MenuBookRoundedIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="subtitle1">My Dictionaries</Typography>
                <Typography variant="body2" color="text.secondary">Each dictionary has its own target and native languages.</Typography>
              </Box>
            </Box>

            <Button
              variant="outlined"
              size="small"
              startIcon={<AddRoundedIcon />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{ borderRadius: 2 }}
            >
              New Dictionary
            </Button>
          </Box>

          <Box sx={{ display: 'grid', gap: 1.5 }}>
            {dictionaries.map((dict) => {
              const isActive = dict.id === activeDictionaryId;
              return (
                <Box
                  key={dict.id}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: isActive ? 'primary.main' : '#E5E4DE',
                    backgroundColor: isActive ? alpha('#2453A6', 0.04) : '#FFFDF9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5,
                  }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {dict.name}
                      </Typography>
                      {isActive && (
                        <Chip
                          label="ACTIVE"
                          size="small"
                          color="primary"
                          sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }}
                        />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                      Learn: <strong>{dict.targetLanguage.toUpperCase()}</strong> • Explanations in: <strong>{dict.baseLanguage.toUpperCase()}</strong>
                      {dict.wordCount !== undefined && ` • ${dict.wordCount} words`}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {!isActive ? (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleSelectDictionary(dict.id)}
                        sx={{ borderRadius: 1.75 }}
                      >
                        Set Active
                      </Button>
                    ) : (
                      <Tooltip title="Currently active dictionary">
                        <CheckCircleRoundedIcon color="primary" sx={{ mr: 1 }} />
                      </Tooltip>
                    )}

                    {dictionaries.length > 1 && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteDictionary(dict.id, dict.name)}
                        aria-label="Delete dictionary"
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </CardContent>
      </Card>

      {/* Active Dictionary Languages Card */}
      <Card>
        <CardContent sx={{ p: { xs: 2.25, sm: 3.5 }, '&:last-child': { pb: { xs: 2.25, sm: 3.5 } } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 3 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 2.5,
                color: 'secondary.main',
                backgroundColor: '#FBE8E0',
              }}
            >
              <TuneRoundedIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle1">Active Dictionary Languages</Typography>
              <Typography variant="body2" color="text.secondary">Configure the language pair for your current deck.</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.75 }}>
            <FormControl fullWidth>
              <InputLabel id="target-language-label">Learned Language (Target)</InputLabel>
              <Select
                labelId="target-language-label"
                value={targetLanguage}
                label="Learned Language (Target)"
                onChange={(event) => setTargetLanguage(event.target.value)}
                inputProps={{ 'data-testid': 'learned-language-select' }}
              >
                <MenuItem value="en">English (EN)</MenuItem>
                <MenuItem value="es">Spanish (ES)</MenuItem>
                <MenuItem value="fr">French (FR)</MenuItem>
                <MenuItem value="de">German (DE)</MenuItem>
                <MenuItem value="ru">Russian (RU)</MenuItem>
                <MenuItem value="it">Italian (IT)</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="base-language-label">Base Language (Native)</InputLabel>
              <Select
                labelId="base-language-label"
                value={baseLanguage}
                label="Base Language (Native)"
                onChange={(event) => setBaseLanguage(event.target.value)}
                inputProps={{ 'data-testid': 'base-language-select' }}
              >
                <MenuItem value="ru">Russian (RU)</MenuItem>
                <MenuItem value="en">English (EN)</MenuItem>
                <MenuItem value="de">German (DE)</MenuItem>
                <MenuItem value="es">Spanish (ES)</MenuItem>
                <MenuItem value="fr">French (FR)</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {success && (
            <Alert severity="success" sx={{ mt: 2.5 }}>
              Settings saved successfully
            </Alert>
          )}

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleSaveActiveLanguages}
              disabled={saving}
              endIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <CreateDictionaryDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={() => {
          apiClient.get('/dictionaries').then((res) => {
            if (res.data.dictionaries) setDictionaries(res.data.dictionaries);
          });
        }}
      />
    </Box>
  );
}
