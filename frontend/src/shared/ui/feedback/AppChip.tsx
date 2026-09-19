import { alpha, Chip, type ChipProps, type Theme } from '@mui/material';
import type React from 'react';
import { colorTokens } from '../tokens/colors';
import { radiusTokens } from '../tokens/radii';

export type AppChipVariant = 'default' | 'primary' | 'secondary' | 'lang' | 'preset' | 'status';

export interface AppChipProps extends Omit<ChipProps, 'variant'> {
  variant?: AppChipVariant;
}

export const AppChip: React.FC<AppChipProps> = ({
  variant = 'default',
  size = 'small',
  sx,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'lang':
        return {
          backgroundColor: (th: Theme) =>
            alpha(th.palette.primary.main, th.palette.mode === 'dark' ? 0.2 : 0.1),
          color: (th: Theme) =>
            th.palette.mode === 'dark' ? th.palette.primary.light : 'primary.dark',
          fontWeight: 750,
          fontSize: '0.72rem',
        };
      case 'preset':
        return {
          backgroundColor: (th: Theme) =>
            th.palette.mode === 'dark'
              ? colorTokens.learningStatus.preset.darkBg
              : colorTokens.learningStatus.preset.lightBg,
          color: (th: Theme) =>
            th.palette.mode === 'dark' ? '#C4B5FD' : colorTokens.learningStatus.preset.color,
          border: '1px solid',
          borderColor: (th: Theme) =>
            alpha(colorTokens.learningStatus.preset.color, th.palette.mode === 'dark' ? 0.35 : 0.2),
          fontWeight: 700,
          fontSize: '0.68rem',
        };
      case 'status':
        return {
          backgroundColor: (th: Theme) =>
            th.palette.mode === 'dark'
              ? colorTokens.learningStatus.mastered.darkBg
              : colorTokens.learningStatus.mastered.lightBg,
          color: (th: Theme) =>
            th.palette.mode === 'dark' ? th.palette.success.main : colorTokens.learningStatus.mastered.color,
          fontWeight: 700,
          fontSize: '0.7rem',
        };
      case 'primary':
        return {
          backgroundColor: 'primary.main',
          color: '#FFFFFF',
          fontWeight: 700,
        };
      case 'secondary':
        return {
          backgroundColor: 'secondary.main',
          color: '#FFFFFF',
          fontWeight: 700,
        };
      case 'default':
      default:
        return {
          backgroundColor: (th: Theme) =>
            th.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#F1F3F7',
          color: 'text.primary',
          fontWeight: 600,
        };
    }
  };

  return (
    <Chip
      size={size}
      sx={{
        borderRadius: `${radiusTokens.sm}px`,
        ...getVariantStyles(),
        ...sx,
      }}
      {...props}
    />
  );
};
