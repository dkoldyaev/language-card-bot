import { Typography, Box, FormControl, InputLabel, Select, MenuItem, Button } from '@mui/material';
import { useState } from 'react';

export default function Settings() {
  const [baseLanguage, setBaseLanguage] = useState('');
  const [learnedLanguage, setLearnedLanguage] = useState('');
  const [level, setLevel] = useState('');

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
          <MenuItem value="Russian">Russian</MenuItem>
          <MenuItem value="English">English</MenuItem>
          <MenuItem value="Spanish">Spanish</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth margin="normal">
        <InputLabel id="learned-language-label">Learned Language</InputLabel>
        <Select
          labelId="learned-language-label"
          value={learnedLanguage}
          label="Learned Language"
          onChange={(e) => setLearnedLanguage(e.target.value)}
          inputProps={{ 'data-testid': 'learned-language-select' }}
        >
          <MenuItem value="English">English</MenuItem>
          <MenuItem value="Spanish">Spanish</MenuItem>
          <MenuItem value="Russian">Russian</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth margin="normal">
        <InputLabel id="level-label">Level</InputLabel>
        <Select
          labelId="level-label"
          value={level}
          label="Level"
          onChange={(e) => setLevel(e.target.value)}
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

      <Button variant="contained" color="primary" fullWidth sx={{ mt: 3 }}>
        Save Settings
      </Button>
    </Box>
  );
}

