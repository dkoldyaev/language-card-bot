import { Box, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';

interface ActiveDictionaryLanguagesFormProps {
  targetLanguage: string;
  baseLanguage: string;
  onTargetLanguageChange: (value: string) => void;
  onBaseLanguageChange: (value: string) => void;
  disabled?: boolean;
}

export default function ActiveDictionaryLanguagesForm({
  targetLanguage,
  baseLanguage,
  onTargetLanguageChange,
  onBaseLanguageChange,
  disabled = false,
}: ActiveDictionaryLanguagesFormProps) {
  return (
    <Box sx={{ p: 2, borderRadius: 2, border: '1px solid #E5E7EB', backgroundColor: '#FAFAFA' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 2,
            color: 'secondary.main',
            backgroundColor: '#FBE8E0',
          }}
        >
          <TuneRoundedIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Dictionary Languages
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Choose the language you want to learn and your native language.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gap: 2 }}>
        <FormControl fullWidth>
          <InputLabel id="target-language-label">Learned Language (Target)</InputLabel>
          <Select
            labelId="target-language-label"
            value={targetLanguage}
            label="Learned Language (Target)"
            onChange={(e) => onTargetLanguageChange(e.target.value)}
            disabled={disabled}
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
            onChange={(e) => onBaseLanguageChange(e.target.value)}
            disabled={disabled}
            inputProps={{ 'data-testid': 'base-language-select' }}
          >
            <MenuItem value="ru">Russian (RU)</MenuItem>
            <MenuItem value="en">English (EN)</MenuItem>
            <MenuItem value="de">German (DE)</MenuItem>
            <MenuItem value="es">Spanish (ES)</MenuItem>
            <MenuItem value="fr">French (FR)</MenuItem>
            <MenuItem value="it">Italian (IT)</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
}
