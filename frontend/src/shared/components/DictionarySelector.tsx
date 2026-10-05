import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import {
  Box,
  Button,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  type PaperProps,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CreateDictionaryDialog from '../../features/dictionary/components/CreateDictionaryDialog';
import { useGuidelineStore } from '../../features/guideline';
import useStore from '../../store/useStore';
import apiClient from '../api/client';
import { useTranslation } from '../i18n/I18nContext';
import { AppChip, radiusTokens, spacingTokens } from '../ui';
import { useActiveDictionaryId } from '../hooks/useActiveDictionaryId';

type MenuPaperSlotProps = PaperProps & { 'data-testid'?: string };

export default function DictionarySelector() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { locale } = useParams<{ locale: string }>();
  const token = useStore((state) => state.token);
  const dictionaries = useStore((state) => state.dictionaries);
  const activeDictionaryId = useActiveDictionaryId();
  const setDictionary = useStore((state) => state.setDictionary);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const activeDict = dictionaries.find((d) => d.id === activeDictionaryId) || dictionaries[0];

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    useGuidelineStore.getState().advanceStep('step1_dict_selector');
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    if (
      useGuidelineStore.getState().isActive &&
      useGuidelineStore.getState().currentStep === 'step2_create_dict_menu'
    ) {
      useGuidelineStore.setState({ currentStep: 'step1_dict_selector' });
    }
  };

  const handleSelect = async (dictId: number) => {
    handleCloseMenu();
    if (dictId === activeDictionaryId) return;

    navigate(`/${locale}/dictionary/${dictId}`);

    if (!token) {
      const dictWords = useStore.getState().guestDictionaryWords[dictId] || [];
      setDictionary(dictWords, dictId);
      return;
    }

    try {
      await apiClient.post(`/dictionaries/${dictId}/select`);

      // Fetch words for newly selected dictionary
      const res = await apiClient.get('/dictionary', { params: { dictionaryId: dictId } });
      if (res.data.dictionary) {
        setDictionary(res.data.dictionary, dictId);
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
        data-testid="dictionary-selector-button"
        data-tour="dictionary-selector"
        endIcon={<KeyboardArrowDownRoundedIcon fontSize="small" />}
        startIcon={<MenuBookRoundedIcon fontSize="small" sx={{ color: 'primary.main' }} />}
        sx={{
          textTransform: 'none',
          border: '1px solid',
          borderColor: 'divider',
          color: 'text.primary',
          backgroundColor: 'background.paper',
          borderRadius: `${radiusTokens.md}px`,
          px: 1.5,
          py: 0.6,
          fontWeight: 600,
          '&:hover': {
            backgroundColor: 'action.hover',
            borderColor: 'primary.main',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: spacingTokens.micro_gap * 1.5 }}>
          <span>{activeDict ? activeDict.name : t('dictionary.selectDictionary')}</span>
          {activeDict && (
            <AppChip
              variant="lang"
              label={`${activeDict.targetLanguage.toUpperCase()} → ${activeDict.baseLanguage.toUpperCase()}`}
            />
          )}
        </Box>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        transitionDuration={0}
        slotProps={{
          paper: {
            'data-tour': 'dictionary-menu-paper',
            sx: {
              minWidth: 260,
              borderRadius: `${radiusTokens.lg}px`,
              boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
              mt: 0.75,
            },
          } as MenuPaperSlotProps,
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
          data-tour="create-dictionary-menu-item"
          onClick={() => {
            useGuidelineStore.getState().advanceStep('step2_create_dict_menu');
            setAnchorEl(null);
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
        onCreated={(newDict) => {
          navigate(`/${locale}/dictionary/${newDict.id}`);
        }}
      />
    </>
  );
}
