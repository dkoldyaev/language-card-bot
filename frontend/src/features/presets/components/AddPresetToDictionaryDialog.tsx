import AddRoundedIcon from '@mui/icons-material/AddRounded';
import BookRoundedIcon from '@mui/icons-material/BookRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import {
  alpha,
  Box,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  useTheme,
} from '@mui/material';
import { useTranslation } from '../../../shared/i18n';
import { AppButton, AppChip, AppDialog } from '../../../shared/ui';
import type { DictionaryItem } from '../../../store/useStore';
import type { PresetItem } from '../types';

interface AddPresetToDictionaryDialogProps {
  open: boolean;
  preset: PresetItem | null;
  dictionaries: DictionaryItem[];
  /** id словарей в которые идёт добавление */
  addingToDictionaryId: number | null;
  onClose: () => void;
  onSelectDictionary: (preset: PresetItem, dictionary: DictionaryItem) => void;
}

export default function AddPresetToDictionaryDialog({
  open,
  preset,
  dictionaries,
  addingToDictionaryId,
  onClose,
  onSelectDictionary,
}: AddPresetToDictionaryDialogProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  if (!preset) return null;

  const presetLang = (preset.for_language || preset.forLanguage || '').toLowerCase();

  const compatibleDicts = dictionaries.filter(
    (d) => d.targetLanguage.toLowerCase() === presetLang
  );

  const getLangLabel = (code: string) => {
    const key = `languages.${code.toLowerCase()}`;
    const translated = t(key);
    return translated !== key ? translated : code.toUpperCase();
  };

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      title={
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {t('presets.chooseDictionaryTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {t('presets.chooseDictionarySubtitle', {
              preset: preset.title,
            })}
          </Typography>
        </Box>
      }
      actions={
        <AppButton variant="ghost" onClick={onClose}>
          {t('common.cancel')}
        </AppButton>
      }
    >
      {compatibleDicts.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <BookRoundedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            {t('presets.noCompatibleDictionaries')}
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
            {t('presets.createDictionaryHint', {
              lang: getLangLabel(presetLang),
            })}
          </Typography>
        </Box>
      ) : (
        <List sx={{ py: 0, mx: -2 }}>
          {compatibleDicts.map((dict) => {
            const isAdding = addingToDictionaryId === dict.id;
            return (
              <ListItemButton
                key={dict.id}
                onClick={() => !isAdding && onSelectDictionary(preset, dict)}
                disabled={isAdding}
                sx={{
                  px: 2,
                  py: 1.5,
                  borderRadius: 1,
                  mx: 1,
                  mb: 0.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: 'background.paper',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                  },
                  transition: 'all 0.15s ease',
                }}
              >
                <ListItemText
                  primary={
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {dict.name}
                    </Typography>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', gap: 0.75, mt: 0.5, flexWrap: 'wrap' }}>
                      <AppChip
                        variant="lang"
                        label={getLangLabel(dict.targetLanguage)}
                        sx={{ height: 18, fontSize: '0.68rem' }}
                      />
                      <AppChip
                        variant="lang"
                        label={getLangLabel(dict.baseLanguage)}
                        sx={{ height: 18, fontSize: '0.68rem', opacity: 0.7 }}
                      />
                    </Box>
                  }
                />
                {isAdding ? (
                  <CircularProgress size={20} color="primary" />
                ) : (
                  <CheckCircleRoundedIcon
                    sx={{ color: 'primary.main', opacity: 0, fontSize: 20 }}
                  />
                )}
                {!isAdding && (
                  <AddRoundedIcon sx={{ color: 'primary.main', fontSize: 20, ml: 0.5 }} />
                )}
              </ListItemButton>
            );
          })}
        </List>
      )}
    </AppDialog>
  );
}
