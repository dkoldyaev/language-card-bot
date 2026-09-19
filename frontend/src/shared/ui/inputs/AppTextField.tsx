import { TextField, type TextFieldProps } from '@mui/material';
import type React from 'react';
import { radiusTokens } from '../tokens/radii';

export interface AppTextFieldProps extends Omit<TextFieldProps, 'variant'> {
  variant?: 'outlined' | 'filled' | 'standard';
}

export const AppTextField: React.FC<AppTextFieldProps> = ({
  variant = 'outlined',
  sx,
  ...props
}) => {
  return (
    <TextField
      variant={variant}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: `${radiusTokens.md}px`,
          backgroundColor: 'background.paper',
        },
        ...sx,
      }}
      {...props}
    />
  );
};
