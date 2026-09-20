import { Card, CardContent, type CardProps, type Theme } from '@mui/material';
import type React from 'react';
import { colorTokens } from '../tokens/colors';
import { radiusTokens } from '../tokens/radii';
import { spacingTokens } from '../tokens/spacing';

export type AppCardVariant = 'surface' | 'hero' | 'interactive' | 'flat' | 'dashed';
export type AppCardPadding = 'none' | 'compact' | 'normal' | 'spacious';

export interface AppCardProps extends Omit<CardProps, 'variant'> {
  variant?: AppCardVariant;
  padding?: AppCardPadding;
  children: React.ReactNode;
}

export const AppCard: React.FC<AppCardProps> = ({
  variant = 'surface',
  padding = 'normal',
  children,
  sx,
  ...props
}) => {
  const getPadding = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'compact':
        return spacingTokens.block_inner_padding_compact;
      case 'spacious':
        return spacingTokens.block_inner_padding_spacious;
      default:
        return spacingTokens.block_inner_padding_normal;
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'hero':
        return {
          backgroundColor: (th: Theme) =>
            th.palette.mode === 'dark' ? colorTokens.hero.darkBg : colorTokens.hero.lightBg,
          color: colorTokens.hero.text,
          border: 'none',
          boxShadow: '0 18px 38px rgba(23, 32, 51, 0.16)',
        };
      case 'interactive':
        return {
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          transition: 'transform 0.18s ease-in-out, box-shadow 0.18s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: (th: Theme) =>
              th.palette.mode === 'dark'
                ? '0 12px 32px rgba(0, 0, 0, 0.5)'
                : '0 12px 30px rgba(23, 32, 51, 0.08)',
          },
        };
      case 'dashed':
        return {
          backgroundColor: 'background.paper',
          border: '1px dashed',
          borderColor: 'divider',
          boxShadow: 'none',
        };
      case 'flat':
        return {
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 'none',
        };
      default:
        return {
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: (th: Theme) =>
            th.palette.mode === 'dark'
              ? '0 6px 20px rgba(0, 0, 0, 0.3)'
              : '0 4px 18px rgba(23, 32, 51, 0.04)',
        };
    }
  };

  return (
    <Card
      sx={{
        borderRadius: `${radiusTokens.xl}px`,
        ...getVariantStyles(),
        ...sx,
      }}
      {...props}
    >
      {padding === 'none' ? (
        children
      ) : (
        <CardContent
          sx={{
            p: getPadding(),
            '&:last-child': { pb: getPadding() },
          }}
        >
          {children}
        </CardContent>
      )}
    </Card>
  );
};
