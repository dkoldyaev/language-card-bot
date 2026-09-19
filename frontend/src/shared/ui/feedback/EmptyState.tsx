import { Box, type BoxProps, Typography } from '@mui/material';
import type React from 'react';
import { AppCard } from '../surfaces/AppCard';
import { spacingTokens } from '../tokens/spacing';

export interface EmptyStateProps extends BoxProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'card' | 'dashed' | 'plain';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  variant = 'card',
  sx,
  ...props
}) => {
  const content = (
    <Box
      sx={{
        textAlign: 'center',
        py: { xs: 4, sm: 6 },
        px: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        ...sx,
      }}
      {...props}
    >
      {icon && (
        <Box
          sx={{
            fontSize: '3rem',
            color: 'text.secondary',
            mb: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
      )}

      <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.75, maxWidth: 480 }}>
        {title}
      </Typography>

      {description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ maxWidth: 420, mb: action ? 3 : 0, lineHeight: 1.5 }}
        >
          {description}
        </Typography>
      )}

      {action && <Box sx={{ mt: spacingTokens.element_group_gap }}>{action}</Box>}
    </Box>
  );

  if (variant === 'plain') {
    return content;
  }

  return (
    <AppCard
      variant={variant === 'dashed' ? 'dashed' : 'surface'}
      padding="none"
    >
      {content}
    </AppCard>
  );
};
