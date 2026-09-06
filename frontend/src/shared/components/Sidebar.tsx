import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import useStore from '../../store/useStore';

const navItems = [
  { path: '/', label: 'Dashboard', icon: <HomeRoundedIcon /> },
  { path: '/dictionary', label: 'Dictionary', icon: <MenuBookRoundedIcon /> },
  { path: '/quiz', label: 'Quiz', icon: <SchoolRoundedIcon /> },
  { path: '/settings', label: 'Settings', icon: <SettingsRoundedIcon /> },
];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <Box
        component="img"
        src="/favicon.svg"
        alt=""
        sx={{ width: compact ? 30 : 38, height: compact ? 30 : 38, display: 'block' }}
      />
      {!compact && (
        <Box>
          <Typography sx={{ color: '#FFFFFF', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.04em' }}>
            CardBot
          </Typography>
          <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.58), display: 'block', mt: 0.2 }}>
            Your word studio
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default function Sidebar() {
  const profile = useStore((state) => state.profile);
  const reset = useStore((state) => state.reset);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleLogout = () => {
    reset();
    navigate('/login');
  };

  if (isMobile) {
    return (
      <Box
        component="nav"
        aria-label="Main navigation"
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          minHeight: 76,
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'space-around',
          px: 0.5,
          zIndex: 1200,
          backgroundColor: alpha('#FFFFFF', 0.97),
          borderTop: '1px solid #DDDCD5',
          backdropFilter: 'blur(16px)',
        }}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItemButton
              key={item.path}
              component={NavLink}
              to={item.path}
              aria-label={item.label}
              sx={{
                minWidth: 62,
                maxWidth: 86,
                flex: 1,
                px: 0.5,
                py: 0.8,
                borderRadius: 0,
                flexDirection: 'column',
                justifyContent: 'center',
                color: isActive ? 'primary.main' : 'text.secondary',
                '&::before': isActive ? {
                  content: '""',
                  position: 'absolute',
                  top: 5,
                  width: 26,
                  height: 3,
                  borderRadius: 3,
                  backgroundColor: 'secondary.main',
                } : undefined,
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, mb: 0.25, color: 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <Typography variant="caption" sx={{ fontWeight: isActive ? 800 : 700, fontSize: '0.62rem' }}>
                {item.label}
              </Typography>
            </ListItemButton>
          );
        })}
        <ListItemButton
          onClick={handleLogout}
          aria-label="Sign out"
          sx={{
            minWidth: 62,
            maxWidth: 76,
            flex: 1,
            px: 0.5,
            py: 0.8,
            borderRadius: 0,
            flexDirection: 'column',
            justifyContent: 'center',
            color: 'text.secondary',
          }}
        >
          <ListItemIcon sx={{ minWidth: 0, mb: 0.25, color: 'inherit' }}>
            <LogoutRoundedIcon />
          </ListItemIcon>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.62rem' }}>
            Sign out
          </Typography>
        </ListItemButton>
      </Box>
    );
  }

  return (
    <Box
      component="nav"
      aria-label="Main navigation"
      sx={{
        width: 264,
        height: '100dvh',
        position: 'fixed',
        left: 0,
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1100,
        overflowY: 'auto',
        color: '#FFFFFF',
        backgroundColor: '#172033',
      }}
    >
      <Box sx={{ px: 3, pt: 3.25, pb: 4 }}>
        <Brand />
      </Box>

      <Box sx={{ px: 2.5, pb: 1 }}>
        <Typography variant="overline" sx={{ color: alpha('#FFFFFF', 0.42), fontSize: '0.64rem' }}>
          Workspace
        </Typography>
      </Box>

      <List sx={{ px: 1.5, pt: 0, flexGrow: 1 }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItemButton
              key={item.path}
              component={NavLink}
              to={item.path}
              sx={{
                position: 'relative',
                minHeight: 52,
                mb: 0.75,
                px: 1.5,
                borderRadius: 3,
                color: isActive ? '#FFFFFF' : alpha('#FFFFFF', 0.65),
                backgroundColor: isActive ? alpha('#FFFFFF', 0.12) : 'transparent',
                '&:hover': {
                  color: '#FFFFFF',
                  backgroundColor: alpha('#FFFFFF', isActive ? 0.15 : 0.075),
                },
                '&::before': isActive ? {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 14,
                  width: 3,
                  height: 24,
                  borderRadius: 2,
                  backgroundColor: '#E8A17F',
                } : undefined,
              }}
            >
              <ListItemIcon sx={{ minWidth: 39, color: 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: isActive ? 800 : 700 }}>
                    {item.label}
                  </Typography>
                }
              />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ p: 2.25, borderTop: '1px solid rgba(255, 255, 255, 0.12)' }}>
        {profile && (
          <Box sx={{ px: 1.25, pb: 1.5 }}>
            <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.5), display: 'block', mb: 0.25 }}>
              Learning as
            </Typography>
            <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 800 }} noWrap>
              {profile.username}
            </Typography>
          </Box>
        )}
        <ListItemButton
          onClick={handleLogout}
          sx={{
            minHeight: 48,
            borderRadius: 3,
            px: 1.5,
            color: alpha('#FFFFFF', 0.7),
            '&:hover': {
              color: '#FFFFFF',
              backgroundColor: alpha('#FFFFFF', 0.075),
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 39, color: 'inherit' }}>
            <LogoutRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={<Typography sx={{ fontSize: '0.875rem', fontWeight: 700 }}>Sign out</Typography>}
          />
        </ListItemButton>
      </Box>
    </Box>
  );
}
