import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import { alpha, Box, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import { useTranslation } from '../../../shared/i18n';
import { type LanguageCode, SUPPORTED_LANGUAGES } from '../../../shared/i18n/types';

interface ActiveDictionaryLanguagesFormProps {
  targetLanguage: LanguageCode | null;
  baseLanguage: LanguageCode | null;
  onTargetLanguageChange: (value: LanguageCode) => void;
  onBaseLanguageChange: (value: LanguageCode) => void;
  disabled?: boolean;
}

export default function ActiveDictionaryLanguagesForm({
  targetLanguage,
  baseLanguage,
  onTargetLanguageChange,
  onBaseLanguageChange,
  disabled = false,
}: ActiveDictionaryLanguagesFormProps) {
  const { t } = useTranslation();

  return (
    <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '50%',
            color: 'secondary.main',
            backgroundColor: (th) => th.palette.mode === 'dark' ? alpha(th.palette.secondary.main, 0.15) : '#FBE8E0',
          }}
        >
          <TuneRoundedIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {t('languages.dictionaryLanguagesTitle')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('languages.dictionaryLanguagesDesc')}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gap: 2 }}>
        <FormControl fullWidth>
          <InputLabel id="target-language-label">{t('languages.targetLangLabel')}</InputLabel>
          <Select
            labelId="target-language-label"
            value={targetLanguage}
            label={t('languages.targetLangLabel')}
            onChange={(e) => onTargetLanguageChange(e.target.value as LanguageCode)}
            disabled={disabled}
            inputProps={{ 'data-testid': 'learned-language-select' }}
            MenuProps={{
              disablePortal: true,
              transitionDuration: 0,
            }}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <MenuItem key={lang} value={lang}>
                {t(`languages.${lang}`)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel id="base-language-label">{t('languages.nativeLangLabel')}</InputLabel>
          <Select
            labelId="base-language-label"
            value={baseLanguage}
            label={t('languages.nativeLangLabel')}
            onChange={(e) => onBaseLanguageChange(e.target.value as LanguageCode)}
            disabled={disabled}
            inputProps={{ 'data-testid': 'base-language-select' }}
            MenuProps={{
              disablePortal: true,
              transitionDuration: 0,
            }}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <MenuItem key={lang} value={lang}>
                {t(`languages.${lang}`)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
}
