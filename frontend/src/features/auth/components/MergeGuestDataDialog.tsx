import AddToPhotosRoundedIcon from '@mui/icons-material/AddToPhotosRounded';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { useTranslation } from '../../../shared/i18n';

interface MergeGuestDataDialogProps {
  open: boolean;
  onConfirmMerge: () => void;
  onDiscard: () => void;
  loading?: boolean;
}

export default function MergeGuestDataDialog({
  open,
  onConfirmMerge,
  onDiscard,
  loading = false,
}: MergeGuestDataDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      maxWidth="xs"
      fullWidth
      data-testid="merge-guest-dialog"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            p: 1.5,
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 2,
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
            }}
          >
            <AddToPhotosRoundedIcon />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {t('guest.mergeTitle')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1.5 }}>
        <Typography variant="body1" color="text.secondary">
          {t('guest.mergeDesc')}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button
          fullWidth
          variant="contained"
          disabled={loading}
          onClick={onConfirmMerge}
          data-testid="merge-guest-confirm-btn"
        >
          {t('guest.mergeConfirm')}
        </Button>
        <Button
          fullWidth
          variant="text"
          color="inherit"
          disabled={loading}
          onClick={onDiscard}
          data-testid="merge-guest-discard-btn"
          sx={{ color: 'text.secondary' }}
        >
          {t('guest.mergeDiscard')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
