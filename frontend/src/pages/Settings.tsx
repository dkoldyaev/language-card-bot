import { Typography, Box, FormControl, InputLabel, Select, MenuItem, Button, CircularProgress } from '@mui/material';
import { useState, useEffect } from 'react';
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
      })
      .catch((error) => console.error('Failed to save settings', error))
      .finally(() => setSaving(false));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" gutterBottom>Settings</Typography>
      
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

      <Button
        variant="contained"
        color="primary"
        fullWidth
        sx={{ mt: 3 }}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>

      {success && (
        <Typography color="success.main" sx={{ mt: 2, textAlign: 'center' }}>
          Settings saved successfully
        </Typography>
      )}
    </Box>
  );
}


