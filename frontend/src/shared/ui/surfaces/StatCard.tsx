import { alpha, Box, LinearProgress, Typography } from '@mui/material';
import type React from 'react';
import { AppCard } from './AppCard';

export interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  progress?: number;
  progressColor?: string;
  dataTestId?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  iconBg,
  title,
  value,
  subtitle,
  progress,
  progressColor = '#2A9D8F',
  dataTestId,
}) => {
  return (
    <AppCard
      variant="interactive"
      padding="compact"
      data-testid={dataTestId}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            backgroundColor: iconBg,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 800,
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontSize: '0.72rem',
          }}
        >
          {title}
        </Typography>
      </Box>

      <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
        {value}
      </Typography>

      {progress !== undefined ? (
        <Box sx={{ mt: 1.25 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: alpha(progressColor, 0.15),
              '& .MuiLinearProgress-bar': {
                backgroundColor: progressColor,
                borderRadius: 3,
              },
            }}
          />
        </Box>
      ) : (
        subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {subtitle}
          </Typography>
        )
      )}
    </AppCard>
  );
};
