import { Box, type BoxProps, CircularProgress, Typography } from '@mui/material';
import type React from 'react';

export interface LoadingStateProps extends BoxProps {
  message?: string;
  minHeight?: number | string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message,
  minHeight = '40vh',
  sx,
  ...props
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight,
        py: 6,
        gap: 2,
        ...sx,
      }}
      {...props}
    >
      <CircularProgress size={36} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );
};
