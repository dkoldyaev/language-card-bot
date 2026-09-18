import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import {
  Box,
  Button,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useGuidelineStore } from '../../features/guideline';
import { useTranslation } from '../i18n';
import type { LocaleInfo, SupportedLocale } from '../i18n/types';

interface LocaleSwitcherProps {
  variant?: 'outlined' | 'text';
  size?: 'small' | 'medium';
  showLabel?: boolean;
}

export default function LocaleSwitcher({
  variant = 'outlined',
  size = 'small',
  showLabel = true,
}: LocaleSwitcherProps) {
  const { locale, setLocale, locales, currentLocaleInfo } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (code: SupportedLocale) => {
    setLocale(code);
    handleClose();
    useGuidelineStore.getState().advanceStep('step0_locale');
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        variant={variant}
        size={size}
        aria-label="Change language"
        data-testid="locale-switcher-button"
        data-tour="locale-switcher"
        endIcon={<KeyboardArrowDownRoundedIcon fontSize="small" />}
        sx={{
          textTransform: 'none',
          border: '1px solid',
          borderColor: 'divider',
          color: 'text.primary',
          backgroundColor: 'background.paper',
          borderRadius: 2,
          px: 1.25,
          py: 0.6,
          fontWeight: 600,
          minWidth: 'auto',
          '&:hover': {
            backgroundColor: 'action.hover',
            borderColor: 'primary.main',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{currentLocaleInfo.flag}</span>
          {showLabel && (
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
              {currentLocaleInfo.code.toUpperCase()}
            </Typography>
          )}
        </Box>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        transitionDuration={0}
        slotProps={{
          paper: {
            'data-tour': 'locale-menu-paper',
            sx: {
              minWidth: 180,
              borderRadius: 2,
              boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
              mt: 0.75,
              maxHeight: 380,
            },
          } as any,
        }}
      >
        {locales.map((item: LocaleInfo) => {
          const isSelected = item.code === locale;
          return (
            <MenuItem
              key={item.code}
              data-testid={`locale-option-${item.code}`}
              onClick={() => handleSelect(item.code)}
              selected={isSelected}
              sx={{
                py: 0.9,
                px: 1.75,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>{item.flag}</span>
                <ListItemText
                  primary={
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: isSelected ? 700 : 500, fontSize: '0.875rem' }}
                    >
                      {item.nativeLabel}
                    </Typography>
                  }
                />
              </Box>
              {isSelected && (
                <ListItemIcon sx={{ minWidth: 'auto', color: 'primary.main', ml: 1 }}>
                  <CheckRoundedIcon fontSize="small" />
                </ListItemIcon>
              )}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
