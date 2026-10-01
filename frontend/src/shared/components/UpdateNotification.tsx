import SystemUpdateAltRoundedIcon from '@mui/icons-material/SystemUpdateAltRounded';
import { Box, Button, Snackbar, Typography } from '@mui/material';
import type React from 'react';
import { useServiceWorker } from '../hooks/useServiceWorker';
import { radiusTokens, spacingTokens } from '../ui/tokens';

export interface UpdateNotificationProps {
  isUpdateAvailable?: boolean;
  onUpdate?: () => void;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = (props) => {
  const sw = useServiceWorker();

  let isUpdateAvailable = sw.isUpdateAvailable;
  if (typeof props.isUpdateAvailable === 'boolean') {
    isUpdateAvailable = props.isUpdateAvailable;
  }

  let handleUpdate = sw.updateApp;
  if (props.onUpdate) {
    handleUpdate = props.onUpdate;
  }

  if (!isUpdateAvailable) {
    return null;
  }

  return (
    <Snackbar
      open={isUpdateAvailable}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{
        bottom: { xs: 80, sm: 24 },
        zIndex: 1400,
      }}
    >
      <Box
        role="alert"
        aria-live="polite"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: spacingTokens.element_group_gap * 1.5,
          py: 1.5,
          px: 2.5,
          borderRadius: `${radiusTokens.md}px`,
          backgroundColor: (th) =>
            th.palette.mode === 'dark' ? '#1E293B' : '#0F172A',
          color: '#FFFFFF',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.28)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        <SystemUpdateAltRoundedIcon sx={{ color: '#38BDF8', fontSize: 22 }} />
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
          A new version of the app is available.
        </Typography>
        <Button
          variant="contained"
          size="small"
          onClick={handleUpdate}
          data-testid="pwa-update-now-btn"
          sx={{
            ml: 1,
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: `${radiusTokens.sm}px`,
            backgroundColor: '#38BDF8',
            color: '#0F172A',
            '&:hover': {
              backgroundColor: '#0EA5E9',
            },
          }}
        >
          Update Now
        </Button>
      </Box>
    </Snackbar>
  );
};

export default UpdateNotification;
