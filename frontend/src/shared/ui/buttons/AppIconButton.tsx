import { alpha, IconButton, type IconButtonProps, Tooltip } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import type React from 'react';

export interface AppIconButtonProps extends IconButtonProps {
  tooltip?: string;
  tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right';
  variant?: 'ghost' | 'outlined' | 'subtle';
}

export const AppIconButton: React.FC<AppIconButtonProps> = ({
  tooltip,
  tooltipPlacement = 'top',
  variant = 'ghost',
  children,
  sx,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'outlined':
        return {
          border: '1px solid',
          borderColor: 'divider',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: (th: Theme) =>
              alpha(th.palette.primary.main, th.palette.mode === 'dark' ? 0.12 : 0.06),
          },
        };
      case 'subtle':
        return {
          backgroundColor: 'action.hover',
          '&:hover': {
            backgroundColor: 'action.selected',
          },
        };
      default:
        return {
          '&:hover': {
            backgroundColor: (th: Theme) =>
              alpha(th.palette.primary.main, th.palette.mode === 'dark' ? 0.12 : 0.06),
          },
        };
    }
  };

  const button = (
    <IconButton
      sx={{
        borderRadius: '50%',
        transition: 'all 150ms ease',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        ...getVariantStyles(),
        ...sx,
      }}
      {...props}
    >
      {children}
    </IconButton>
  );

  if (tooltip) {
    return (
      <Tooltip title={tooltip} placement={tooltipPlacement}>
        {props.disabled ? <span>{button}</span> : button}
      </Tooltip>
    );
  }

  return button;
};
