import { useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
  Divider,
  alpha,
} from '@mui/material';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import useStore from '../../store/useStore';
import apiClient from '../api/client';
import CreateDictionaryDialog from '../../features/dictionary/components/CreateDictionaryDialog';

export default function DictionarySelector() {
  const dictionaries = useStore((state) => state.dictionaries);
  const activeDictionaryId = useStore((state) => state.activeDictionaryId);
  const setActiveDictionaryId = useStore((state) => state.setActiveDictionaryId);
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

    try {
      await apiClient.post(`/dictionaries/${dictId}/select`);
      setActiveDictionaryId(dictId);

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
        aria-label="Select dictionary"
        data-testid="dictionary-selector-button"
        endIcon={<KeyboardArrowDownRoundedIcon fontSize="small" />}
        startIcon={<MenuBookRoundedIcon fontSize="small" sx={{ color: 'primary.main' }} />}
        sx={{
          textTransform: 'none',
          borderColor: '#DDDCD5',
          color: 'text.primary',
          backgroundColor: '#FFFFFF',
          borderRadius: 2,
          px: 1.5,
          py: 0.6,
          fontWeight: 600,
          '&:hover': {
            backgroundColor: '#F7F5EF',
            borderColor: '#C8C7C0',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <span>{activeDict ? activeDict.name : 'Select Dictionary'}</span>
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
              borderRadius: 2.5,
              boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
              mt: 0.75,
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            YOUR DICTIONARIES
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
                  {dict.wordCount !== undefined && ` • ${dict.wordCount} words`}
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
            primary={<Typography variant="body2" sx={{ fontWeight: 600 }}>Create New Dictionary</Typography>}
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
