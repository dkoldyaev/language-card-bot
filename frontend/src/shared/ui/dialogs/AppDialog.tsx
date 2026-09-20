import {
  Dialog,
  DialogActions,
  DialogContent,
  type DialogProps,
  DialogTitle,
  type PaperProps,
} from '@mui/material';
import type React from 'react';
import { radiusTokens } from '../tokens/radii';

export interface AppDialogProps extends Omit<DialogProps, 'title'> {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  dividers?: boolean;
}

export const AppDialog: React.FC<AppDialogProps> = ({
  open,
  onClose,
  title,
  actions,
  children,
  maxWidth = 'sm',
  fullWidth = true,
  dividers = false,
  slotProps,
  ...props
}) => {
  const paperSlot = slotProps?.paper;
  const paperProps: Partial<PaperProps> =
    paperSlot && typeof paperSlot === 'object' ? (paperSlot as Partial<PaperProps>) : {};

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      slotProps={{
        paper: {
          ...paperProps,
          sx: {
            borderRadius: `${radiusTokens.lg}px`,
            backgroundImage: 'none',
            ...((paperProps.sx && typeof paperProps.sx === 'object') ? paperProps.sx : {}),
          },
        },
      }}
      {...props}
    >
      {title && (
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.25rem', px: 3, pt: 3, pb: 1.5 }}>
          {title}
        </DialogTitle>
      )}

      <DialogContent dividers={dividers} sx={{ px: 3, py: dividers ? 2.5 : 1 }}>
        {children}
      </DialogContent>

      {actions && (
        <DialogActions sx={{ px: 3, pb: 3, pt: 1.5, gap: 1 }}>
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
};
