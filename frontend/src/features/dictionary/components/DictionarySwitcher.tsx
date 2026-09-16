import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import {
  alpha,
  Box,
  Button,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useTranslation } from '../../../shared/i18n/I18nContext';
import type { DictionaryItem } from '../../../store/useStore';

interface DictionarySwitcherProps {
  dictionaries: DictionaryItem[];
  selectedDictionaryId: number | null;
  activeDictionaryId: number | null;
  onSelectDictionary: (dictId: number) => void;
  onOpenCreateDialog: () => void;
  onDeleteDictionary?: (dictId: number, name: string) => void;
}

export default function DictionarySwitcher({
  dictionaries,
  selectedDictionaryId,
  activeDictionaryId,
  onSelectDictionary,
  onOpenCreateDialog,
  onDeleteDictionary,
}: DictionarySwitcherProps) {
  const { t } = useTranslation();
  return (
    <Box
      data-testid="dictionary-page-switcher"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        mb: 3,
        flexWrap: 'wrap',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        {dictionaries.map((dict) => {
          const isSelected = dict.id === selectedDictionaryId;
          const isActiveDeck = dict.id === activeDictionaryId;

          return (
            <Box
              key={dict.id}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: 2,
                border: '1px solid',
                borderColor: isSelected ? 'primary.main' : 'divider',
                backgroundColor: isSelected ? 'primary.main' : 'background.paper',
                overflow: 'hidden',
                transition: 'all 0.15s ease-in-out',
                '&:hover': {
                  borderColor: isSelected ? 'primary.dark' : 'text.secondary',
                },
              }}
            >
              <Button
                data-testid={`dict-tab-${dict.id}`}
                onClick={() => onSelectDictionary(dict.id)}
                size="small"
                sx={{
                  textTransform: 'none',
                  color: isSelected ? '#FFFFFF' : 'text.primary',
                  px: 1.75,
                  py: 0.75,
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  borderRadius: 0,
                  '&:hover': {
                    backgroundColor: isSelected ? 'rgba(0, 0, 0, 0.08)' : 'action.hover',
                  },
                }}
              >
                <span>{dict.name}</span>
                <Chip
                  label={`${dict.targetLanguage.toUpperCase()} → ${dict.baseLanguage.toUpperCase()}`}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.22)' : alpha('#2453A6', 0.08),
                    color: isSelected ? '#FFFFFF' : 'primary.main',
                  }}
                />
                {isActiveDeck && (
                  <Tooltip title={t('dictionary.activeTooltip')}>
                    <Chip
                      label={t('dictionary.activeBadge')}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.6rem',
                        fontWeight: 800,
                        backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.3)' : alpha('#24756D', 0.12),
                        color: isSelected ? '#FFFFFF' : '#24756D',
                      }}
                    />
                  </Tooltip>
                )}
              </Button>

              {onDeleteDictionary && dictionaries.length > 1 && (
                <Tooltip title={t('dictionary.deleteDictTooltip', { name: dict.name })}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteDictionary(dict.id, dict.name);
                    }}
                    sx={{
                      color: isSelected ? 'rgba(255, 255, 255, 0.75)' : 'text.secondary',
                      mr: 0.5,
                      p: 0.5,
                      '&:hover': {
                        color: isSelected ? '#FFFFFF' : 'error.main',
                        backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.15)' : 'rgba(185, 67, 67, 0.08)',
                      },
                    }}
                    aria-label={t('dictionary.deleteDictTooltip', { name: dict.name })}
                  >
                    <DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          );
        })}
      </Box>

      <Button
        variant="outlined"
        size="small"
        startIcon={<AddRoundedIcon />}
        onClick={onOpenCreateDialog}
        sx={{
          borderRadius: 2,
          textTransform: 'none',
          fontWeight: 600,
          borderColor: 'divider',
          color: 'text.primary',
          backgroundColor: 'background.paper',
          px: 1.5,
          py: 0.7,
          '&:hover': {
            borderColor: 'primary.main',
            color: 'primary.main',
            backgroundColor: alpha('#2453A6', 0.04),
          },
        }}
      >
        {t('dictionary.newDictionaryBtn')}
      </Button>
    </Box>
  );
}
