import { Outlet } from 'react-router-dom';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import Sidebar from './Sidebar';

export default function Layout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: isMobile ? 0 : '240px',
          pb: isMobile ? '80px' : 0,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            maxWidth: 960,
            width: '100%',
            mx: 'auto',
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 3, md: 4 },
            flexGrow: 1,
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
