import {
  Alert, Box, Button, Card, CardContent, CircularProgress, FormControl, InputLabel,
  MenuItem, Select, Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import apiClient from '../../../shared/api/client';
import useStore from '../../../store/useStore';
import { trackEvent } from '../../../shared/lib/analytics';

export default function Settings() {
  const settings = useStore((state) => state.settings);
  const setSettings = useStore((state) => state.setSettings);
  const [baseLanguage, setBaseLanguage] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [desiredLevel, setDesiredLevel] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setBaseLanguage(settings.baseLanguage || '');
      setTargetLanguage(settings.targetLanguage || '');
      setDesiredLevel(settings.desiredLevel || '');
    }
    setLoading(false);
  }, [settings]);

  const handleSave = () => {
    setSaving(true);
    setSuccess(false);
    apiClient.post('/settings', { baseLanguage, targetLanguage, desiredLevel })
      .then(() => {
        trackEvent('Settings Updated');
        setSettings({ baseLanguage, targetLanguage, desiredLevel });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      })
      .catch((error) => console.error('Failed to save settings', error))
      .finally(() => setSaving(false));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="animate-fade-in" sx={{ maxWidth: 720 }}>
      <Box sx={{ mb: 3.5 }}>
        <Typography variant="overline" color="secondary.main">Learning setup</Typography>
        <Typography variant="h1" sx={{ fontSize: { xs: '2.35rem', sm: '3rem' }, mt: 0.45 }}>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 560 }}>
          Set the language pair and level that shape your definitions and translations.
        </Typography>
      </Box>

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
                color: 'primary.main',
                backgroundColor: '#E7EEF9',
              }}
            >
              <TuneRoundedIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle1">Your language pair</Typography>
              <Typography variant="body2" color="text.secondary">You can update this at any time.</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.75 }}>
            <FormControl fullWidth>
              <InputLabel id="base-language-label">Base Language</InputLabel>
              <Select
                labelId="base-language-label"
                value={baseLanguage}
                label="Base Language"
                onChange={(event) => setBaseLanguage(event.target.value)}
                inputProps={{ 'data-testid': 'base-language-select' }}
              >
                <MenuItem value="ru">Russian</MenuItem>
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="es">Spanish</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="target-language-label">Learned Language</InputLabel>
              <Select
                labelId="target-language-label"
                value={targetLanguage}
                label="Learned Language"
                onChange={(event) => setTargetLanguage(event.target.value)}
                inputProps={{ 'data-testid': 'learned-language-select' }}
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="es">Spanish</MenuItem>
                <MenuItem value="ru">Russian</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ gridColumn: { sm: 'span 2' }, maxWidth: { sm: 'calc(50% - 7px)' } }}>
              <InputLabel id="level-label">Level</InputLabel>
              <Select
                labelId="level-label"
                value={desiredLevel}
                label="Level"
                onChange={(event) => setDesiredLevel(event.target.value)}
                inputProps={{ 'data-testid': 'level-select' }}
              >
                <MenuItem value="A0">A0</MenuItem>
                <MenuItem value="A1">A1</MenuItem>
                <MenuItem value="A2">A2</MenuItem>
                <MenuItem value="B1">B1</MenuItem>
                <MenuItem value="B2">B2</MenuItem>
                <MenuItem value="C1">C1</MenuItem>
                <MenuItem value="C2">C2</MenuItem>
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
              onClick={handleSave}
              disabled={saving}
              endIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
