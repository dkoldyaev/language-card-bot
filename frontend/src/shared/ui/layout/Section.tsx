import { Box, type BoxProps, Typography } from '@mui/material';
import type React from 'react';
import { spacingTokens } from '../tokens/spacing';

export interface SectionProps extends Omit<BoxProps, 'title'> {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({
  title,
  action,
  children,
  sx,
  ...props
}) => {
  return (
    <Box
      component="section"
      sx={{
        mb: spacingTokens.section_vertical_gap,
        ...sx,
      }}
      {...props}
    >
      {(title || action) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacingTokens.element_group_gap,
            mb: spacingTokens.section_header_gap,
          }}
        >
          {typeof title === 'string' ? (
            <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.06em' }}>
              {title}
            </Typography>
          ) : (
            title
          )}
          {action}
        </Box>
      )}
      {children}
    </Box>
  );
};
