import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Tooltip,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import useStore from '../store/useStore';

const navItems = [
  { path: '/', label: 'Dashboard', icon: <HomeRoundedIcon /> },
  { path: '/dictionary', label: 'Dictionary', icon: <MenuBookRoundedIcon /> },
  { path: '/quiz', label: 'Quiz', icon: <SchoolRoundedIcon /> },
  { path: '/settings', label: 'Settings', icon: <SettingsRoundedIcon /> },
];

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

  // Mobile: bottom tab bar
  if (isMobile) {
    return (
      <Box
        component="nav"
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 64,
          backgroundColor: alpha('#111827', 0.95),
          backdropFilter: 'blur(20px)',
          borderTop: `1px solid ${alpha('#6B7280', 0.15)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          px: 1,
          zIndex: 1200,
        }}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Tooltip key={item.path} title={item.label} placement="top">
              <IconButton
                component={NavLink}
                to={item.path}
                sx={{
                  color: isActive ? 'primary.main' : 'text.secondary',
                  backgroundColor: isActive ? alpha('#7C3AED', 0.12) : 'transparent',
                  borderRadius: 2,
                  p: 1.2,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: alpha('#7C3AED', 0.08),
                    color: 'primary.light',
                  },
                }}
              >
                {item.icon}
              </IconButton>
            </Tooltip>
          );
        })}
        <Tooltip title="Logout" placement="top">
          <IconButton
            onClick={handleLogout}
            sx={{
              color: 'text.secondary',
              borderRadius: 2,
              p: 1.2,
              '&:hover': {
                backgroundColor: alpha('#EF4444', 0.08),
                color: 'error.main',
              },
            }}
          >
            <LogoutRoundedIcon />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  // Desktop: sidebar
  return (
    <Box
      component="nav"
      sx={{
        width: 240,
        minWidth: 240,
        height: '100dvh',
        position: 'fixed',
        left: 0,
        top: 0,
        backgroundColor: alpha('#111827', 0.7),
        backdropFilter: 'blur(20px)',
        borderRight: `1px solid ${alpha('#6B7280', 0.12)}`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1100,
        overflowY: 'auto',
      }}
    >
      {/* Logo / Brand */}
      <Box
        sx={{
          p: 3,
          pb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: 2.5,
            background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 15px ${alpha('#7C3AED', 0.4)}`,
          }}
        >
          <AutoStoriesRoundedIcon sx={{ color: '#fff', fontSize: 20 }} />
        </Box>
        <Box>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #A78BFA, #22D3EE)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              lineHeight: 1.2,
            }}
          >
            CardBot
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1 }}>
            English Learning
          </Typography>
        </Box>
      </Box>

      {/* Navigation */}
      <List sx={{ px: 1.5, py: 1, flexGrow: 1 }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItemButton
              key={item.path}
              component={NavLink}
              to={item.path}
              sx={{
                borderRadius: 2.5,
                mb: 0.5,
                px: 2,
                py: 1.2,
                color: isActive ? 'primary.light' : 'text.secondary',
                backgroundColor: isActive ? alpha('#7C3AED', 0.12) : 'transparent',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: isActive ? alpha('#7C3AED', 0.15) : alpha('#6B7280', 0.08),
                  color: isActive ? 'primary.light' : 'text.primary',
                },
                '&::before': isActive
                  ? {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 3,
                      height: '60%',
                      borderRadius: 4,
                      backgroundColor: 'primary.main',
                    }
                  : {},
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 36,
                  color: 'inherit',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      {/* User / Logout */}
      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${alpha('#6B7280', 0.12)}`,
        }}
      >
        {profile && (
          <Box sx={{ px: 1, pb: 1.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Logged in as
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: 'text.primary' }}
            >
              {profile.username}
            </Typography>
          </Box>
        )}
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 2.5,
            px: 2,
            py: 1,
            color: 'text.secondary',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: alpha('#EF4444', 0.08),
              color: 'error.main',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
            <LogoutRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Logout"
            primaryTypographyProps={{
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          />
        </ListItemButton>
      </Box>
    </Box>
  );
}
