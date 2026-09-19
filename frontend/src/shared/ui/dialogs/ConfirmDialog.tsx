import { Typography } from '@mui/material';
import type React from 'react';
import { AppButton } from '../buttons/AppButton';
import { AppDialog } from './AppDialog';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <AppDialog
      open={open}
      onClose={!loading ? onCancel : undefined}
      maxWidth="xs"
      title={title}
      actions={
        <>
          <AppButton
            variant="ghost"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </AppButton>
          <AppButton
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </AppButton>
        </>
      }
    >
      {typeof message === 'string' ? (
        <Typography variant="body1" color="text.secondary">
          {message}
        </Typography>
      ) : (
        message
      )}
    </AppDialog>
  );
};
