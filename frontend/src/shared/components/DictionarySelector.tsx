import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import {
  alpha,
  Box,
  Button,
  Chip,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import CreateDictionaryDialog from '../../features/dictionary/components/CreateDictionaryDialog';
import useStore from '../../store/useStore';
import apiClient from '../api/client';
import { useTranslation } from '../i18n/I18nContext';

export default function DictionarySelector() {
  const { t } = useTranslation();
  const token = useStore((state) => state.token);
  const dictionaries = useStore((state) => state.dictionaries);
  const activeDictionaryId = useStore((state) => state.activeDictionaryId);
  const setActiveDictionaryId = useStore((state) => state.setActiveDictionaryId);
  const setSelectedDictionaryId = useStore((state) => state.setSelectedDictionaryId);
  const setDictionary = useStore((state) => state.setDictionary);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const activeDict = dictionaries.find((d) => d.id === activeDictionaryId) || dictionaries[0];

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleSelect = async (dictId: number) => {
    handleCloseMenu();
    if (dictId === activeDictionaryId) return;

    if (!token) {
      setActiveDictionaryId(dictId);
      setSelectedDictionaryId(dictId);
      const dictWords = useStore.getState().guestDictionaryWords[dictId] || [];
      setDictionary(dictWords);
      return;
    }

    try {
      await apiClient.post(`/dictionaries/${dictId}/select`);
      setActiveDictionaryId(dictId);
      setSelectedDictionaryId(dictId);

      // Fetch words for newly selected dictionary
      const res = await apiClient.get('/dictionary');
      if (res.data.dictionary) {
        setDictionary(res.data.dictionary);
      }
    } catch (error) {
      console.error('Failed to select dictionary:', error);
    }
  };

  return (
    <>
      <Button
        onClick={handleOpenMenu}
        variant="outlined"
        size="small"
        aria-label={t('dictionary.selectDictionary')}
        data-testid="dictionary-selector-button"
        endIcon={<KeyboardArrowDownRoundedIcon fontSize="small" />}
        startIcon={<MenuBookRoundedIcon fontSize="small" sx={{ color: 'primary.main' }} />}
        sx={{
          textTransform: 'none',
          border: '1px solid',
          borderColor: 'divider',
          color: 'text.primary',
          backgroundColor: 'background.paper',
          borderRadius: 2,
          px: 1.5,
          py: 0.6,
          fontWeight: 600,
          '&:hover': {
            backgroundColor: 'action.hover',
            borderColor: 'primary.main',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <span>{activeDict ? activeDict.name : t('dictionary.selectDictionary')}</span>
          {activeDict && (
            <Chip
              label={`${activeDict.targetLanguage.toUpperCase()} → ${activeDict.baseLanguage.toUpperCase()}`}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.68rem',
                fontWeight: 700,
                backgroundColor: alpha('#2453A6', 0.1),
                color: 'primary.dark',
              }}
            />
          )}
        </Box>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        slotProps={{
          paper: {
            sx: {
              minWidth: 260,
              borderRadius: 2,
              boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
              mt: 0.75,
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {t('dictionary.yourDictionaries')}
          </Typography>
        </Box>

        {dictionaries.map((dict) => {
          const isCurrent = dict.id === activeDictionaryId;
          return (
            <MenuItem
              key={dict.id}
              onClick={() => handleSelect(dict.id)}
              selected={isCurrent}
              sx={{ py: 1, px: 2, display: 'flex', justifyContent: 'space-between', gap: 1 }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: isCurrent ? 700 : 500 }}>
                  {dict.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {dict.targetLanguage.toUpperCase()} → {dict.baseLanguage.toUpperCase()}
                  {dict.wordCount !== undefined && ` • ${t('dictionary.wordsCount', { count: dict.wordCount })}`}
                </Typography>
              </Box>
              {isCurrent && (
                <ListItemIcon sx={{ minWidth: 'auto', color: 'primary.main' }}>
                  <CheckRoundedIcon fontSize="small" />
                </ListItemIcon>
              )}
            </MenuItem>
          );
        })}

        <Divider sx={{ my: 1 }} />

        <MenuItem
          onClick={() => {
            handleCloseMenu();
            setCreateDialogOpen(true);
          }}
          sx={{ py: 1, px: 2, color: 'secondary.dark', fontWeight: 600 }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: 'secondary.dark' }}>
            <AddRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={<Typography variant="body2" sx={{ fontWeight: 600 }}>{t('dialogs.createDeckTitle')}</Typography>}
          />
        </MenuItem>
      </Menu>

      <CreateDictionaryDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />
    </>
  );
}
