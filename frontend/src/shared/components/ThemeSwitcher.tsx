import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import { IconButton, Tooltip, useTheme } from '@mui/material';
import useStore from '../../store/useStore';
import { useTranslation } from '../i18n';

interface ThemeSwitcherProps {
  size?: 'small' | 'medium';
}

export default function ThemeSwitcher({ size = 'small' }: ThemeSwitcherProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const toggleThemeMode = useStore((state) => state.toggleThemeMode);
  const isDark = theme.palette.mode === 'dark';

  const tooltipTitle = isDark ? t('theme.toggleLight') : t('theme.toggleDark');

  return (
    <Tooltip title={tooltipTitle}>
      <IconButton
        onClick={toggleThemeMode}
        data-testid="theme-toggle"
        size={size}
        aria-label={tooltipTitle}
        sx={{
          color: 'text.primary',
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          borderRadius: '50%',
          width: 38,
          height: 38,
          transition: 'background-color 160ms ease, border-color 160ms ease, color 160ms ease',
          '&:hover': {
            backgroundColor: 'action.hover',
            borderColor: 'primary.main',
          },
        }}
      >
        {isDark ? (
          <LightModeRoundedIcon fontSize="small" sx={{ color: '#FBBF24' }} />
        ) : (
          <DarkModeRoundedIcon fontSize="small" sx={{ color: '#647084' }} />
        )}
      </IconButton>
    </Tooltip>
  );
}
