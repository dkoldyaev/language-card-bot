import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { IconButton, InputAdornment, TextField, type TextFieldProps } from '@mui/material';
import type React from 'react';
import { radiusTokens } from '../tokens/radii';

export interface AppSearchInputProps extends Omit<TextFieldProps, 'variant'> {
  onClear?: () => void;
}

export const AppSearchInput: React.FC<AppSearchInputProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  size = 'small',
  sx,
  ...props
}) => {
  return (
    <TextField
      size={size}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchRoundedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
            </InputAdornment>
          ),
          endAdornment: value && onClear ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={onClear}
                aria-label="Clear search"
                sx={{ p: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : undefined,
        },
      }}
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
