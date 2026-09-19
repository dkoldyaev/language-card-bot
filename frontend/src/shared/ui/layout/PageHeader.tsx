import { Box, type BoxProps, Typography } from '@mui/material';
import type React from 'react';
import { spacingTokens } from '../tokens/spacing';

export interface PageHeaderProps extends Omit<BoxProps, 'title'> {
  overline?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  badge?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  overline,
  title,
  subtitle,
  action,
  badge,
  sx,
  ...props
}) => {
  return (
    <Box
      sx={{
        mb: spacingTokens.section_header_gap * 1.5, // 24px default gap below page header
        display: 'flex',
        flexDirection: { xs: 'column', sm: action ? 'row' : 'column' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: action ? 'flex-end' : 'flex-start' },
        gap: spacingTokens.element_group_gap,
        ...sx,
      }}
      {...props}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        {overline && (
          <Box sx={{ mb: spacingTokens.header_overline_title_gap, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="overline" color="secondary.main" sx={{ fontWeight: 800 }}>
              {overline}
            </Typography>
            {badge}
          </Box>
        )}

        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: '2.1rem', sm: '2.75rem' },
            fontWeight: 800,
            lineHeight: 1.15,
            wordBreak: 'break-word',
          }}
        >
          {title}
        </Typography>

        {subtitle && (
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              mt: spacingTokens.header_title_subtitle_gap,
              maxWidth: 640,
              lineHeight: 1.6,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>

      {action && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: spacingTokens.element_group_gap, flexShrink: 0 }}>
          {action}
        </Box>
      )}
    </Box>
  );
};
