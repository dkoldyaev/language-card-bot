import {
  Typography, Box, FormControl, InputLabel, Select, MenuItem,
  Button, CircularProgress, Card, CardContent, alpha, Alert,
} from '@mui/material';
import { useState, useEffect } from 'react';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import apiClient from '../api/client';

export default function Settings() {
  const [baseLanguage, setBaseLanguage] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [desiredLevel, setDesiredLevel] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    apiClient.get('/settings')
      .then((res) => {
        const { settings } = res.data;
        if (settings) {
          setBaseLanguage(settings.baseLanguage || '');
          setTargetLanguage(settings.targetLanguage || '');
          setDesiredLevel(settings.desiredLevel || '');
        }
      })
      .catch((error) => console.error('Failed to load settings', error))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = () => {
    setSaving(true);
    setSuccess(false);
    apiClient.post('/settings', { baseLanguage, targetLanguage, desiredLevel })
      .then(() => {
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
    <Box className="animate-fade-in">
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          mb: 0.5,
          background: 'linear-gradient(135deg, #F3F4F6 0%, #A78BFA 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
        }}
      >
        Settings
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Configure your language learning preferences
      </Typography>

      <Card sx={{ maxWidth: 480 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <SettingsRoundedIcon sx={{ color: 'primary.light', fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Language Preferences
            </Typography>
          </Box>

          <FormControl fullWidth margin="normal">
            <InputLabel id="base-language-label">Base Language</InputLabel>
            <Select
              labelId="base-language-label"
              value={baseLanguage}
              label="Base Language"
              onChange={(e) => setBaseLanguage(e.target.value)}
              inputProps={{ 'data-testid': 'base-language-select' }}
            >
              <MenuItem value="ru">Russian</MenuItem>
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="es">Spanish</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel id="target-language-label">Learned Language</InputLabel>
            <Select
              labelId="target-language-label"
              value={targetLanguage}
              label="Learned Language"
              onChange={(e) => setTargetLanguage(e.target.value)}
              inputProps={{ 'data-testid': 'learned-language-select' }}
            >
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="es">Spanish</MenuItem>
              <MenuItem value="ru">Russian</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel id="level-label">Level</InputLabel>
            <Select
              labelId="level-label"
              value={desiredLevel}
              label="Level"
              onChange={(e) => setDesiredLevel(e.target.value)}
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

          {success && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Settings saved successfully
            </Alert>
          )}

          <Button
            variant="contained"
            fullWidth
            sx={{
              mt: 3,
              py: 1.3,
              background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
              '&:hover': {
                background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
              },
            }}
            onClick={handleSave}
            disabled={saving}
            endIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
