import { Box, type BoxProps } from '@mui/material';
import type React from 'react';
import { spacingTokens } from '../tokens/spacing';

export interface PageContainerProps extends BoxProps {
  size?: 'narrow' | 'default' | 'wide' | 'full';
  children: React.ReactNode;
}

const MAX_WIDTHS = {
  narrow: 760,
  default: 1120,
  wide: 1280,
  full: '100%',
};

export const PageContainer: React.FC<PageContainerProps> = ({
  size = 'default',
  children,
  sx,
  className = 'animate-fade-in',
  ...props
}) => {
  return (
    <Box
      className={className}
      sx={{
        maxWidth: MAX_WIDTHS[size],
        width: '100%',
        mx: 'auto',
        px: spacingTokens.page_outer_horizontal_padding,
        py: spacingTokens.page_outer_vertical_padding,
        flexGrow: 1,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
};
