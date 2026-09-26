import { alpha, Button, type ButtonProps, CircularProgress } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import type React from 'react';
import { radiusTokens } from '../tokens/radii';

export type AppButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

export interface AppButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: AppButtonVariant;
  loading?: boolean;
  children: React.ReactNode;
  component?: React.ElementType;
  to?: string;
}

export const AppButton: React.FC<AppButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled,
  children,
  startIcon,
  endIcon,
  sx,
  color,
  ...props
}) => {
  const getMuiColor = () => {
    if (color) return color;
    switch (variant) {
      case 'secondary':
        return 'secondary';
      case 'danger':
        return 'error';
      default:
        return 'primary';
    }
  };
  const getMinHeight = () => {
    switch (size) {
      case 'small':
        return 36;
      case 'large':
        return 50;
      default:
        return 44;
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: 'secondary.main',
          color: '#FFFFFF',
          '&:hover': {
            backgroundColor: 'secondary.dark',
          },
        };
      case 'danger':
        return {
          backgroundColor: 'error.main',
          color: '#FFFFFF',
          '&:hover': {
            backgroundColor: 'error.dark',
          },
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: 'text.primary',
          border: '1px solid',
          borderColor: 'divider',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: (th: Theme) =>
              alpha(th.palette.primary.main, th.palette.mode === 'dark' ? 0.12 : 0.05),
          },
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'text.secondary',
          '&:hover': {
            backgroundColor: 'action.hover',
            color: 'text.primary',
          },
        };
      default:
        return {
          backgroundColor: 'primary.main',
          color: '#FFFFFF',
          '&:hover': {
            backgroundColor: 'primary.dark',
          },
          '&.Mui-disabled': {
            backgroundColor: 'primary.light',
            color: 'rgba(255, 255, 255, 0.7)',
          },
        };
    }
  };

  return (
    <Button
      color={getMuiColor()}
      disabled={disabled || loading}
      startIcon={!loading ? startIcon : undefined}
      endIcon={
        loading ? (
          <CircularProgress size={size === 'small' ? 14 : 18} color="inherit" />
        ) : (
          endIcon
        )
      }
      sx={{
        borderRadius: `${radiusTokens.md}px`,
        minHeight: getMinHeight(),
        fontWeight: 700,
        textTransform: 'none',
        letterSpacing: 0,
        px: size === 'small' ? 1.75 : size === 'large' ? 3.5 : 2.5,
        transition: 'all 160ms ease',
        ...getVariantStyles(),
        ...sx,
      }}
      {...props}
    >
      {children}
    </Button>
  );
};
