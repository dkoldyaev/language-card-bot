import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import {
  alpha,
  Box,
  Chip,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useGuidelineStore } from '../../features/guideline';
import useStore from '../../store/useStore';
import { useTranslation } from '../i18n/I18nContext';
import { colorTokens, radiusTokens, spacingTokens } from '../ui/tokens';

function Brand({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
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
            {t('nav.brandSubtitle')}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default function Sidebar() {
  const { t } = useTranslation();
  const token = useStore((state) => state.token);
  const profile = useStore((state) => state.profile);
  const dictionary = useStore((state) => state.dictionary);
  const reset = useStore((state) => state.reset);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const navItems = [
    { path: '/', label: t('nav.dashboard'), icon: <HomeRoundedIcon /> },
    { path: '/dictionary', label: t('nav.dictionary'), icon: <MenuBookRoundedIcon /> },
    { path: '/quiz', label: t('nav.quiz'), icon: <SchoolRoundedIcon /> },
    { path: '/presets', label: t('nav.presets'), icon: <AutoAwesomeRoundedIcon /> },
  ];

  const hasWords = dictionary.length > 0;
  const currentNavItems = navItems;

  const handleLogout = () => {
    reset();
    navigate('/');
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
          backgroundColor: (th) => alpha(th.palette.background.paper, 0.97),
          borderTop: '1px solid',
          borderColor: 'divider',
          backdropFilter: 'blur(16px)',
        }}
      >
        {currentNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          const isDisabled = item.path === '/quiz' && !hasWords;
          const button = (
            <ListItemButton
              key={item.path}
              component={isDisabled ? 'button' : NavLink}
              to={isDisabled ? undefined : item.path}
              disabled={isDisabled}
              aria-label={item.label}
              data-tour={item.path === '/quiz' ? 'nav-quiz' : undefined}
              onClick={() => {
                if (item.path === '/quiz') {
                  useGuidelineStore.getState().advanceStep('step4_nav_quiz');
                }
              }}
              sx={{
                minWidth: 62,
                maxWidth: 86,
                flex: 1,
                px: 0.5,
                py: 0.8,
                borderRadius: 0,
                flexDirection: 'column',
                justifyContent: 'center',
                color: isDisabled ? 'text.disabled' : isActive ? 'primary.main' : 'text.secondary',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.4 : 1,
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

          if (isDisabled) {
            return (
              <Tooltip key={item.path} title={t('nav.quizLockedTooltip')} placement="top">
                <Box component="div" sx={{ display: 'flex', flex: 1, minWidth: 62, maxWidth: 86 }}>
                  {button}
                </Box>
              </Tooltip>
            );
          }

          return button;
        })}
        {token ? (
          <ListItemButton
            onClick={handleLogout}
            aria-label={t('nav.signOut')}
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
              {t('nav.signOut')}
            </Typography>
          </ListItemButton>
        ) : (
          <ListItemButton
            component={NavLink}
            to="/login"
            data-testid="mobile-login-btn"
            aria-label={t('auth.submitLogin')}
            sx={{
              minWidth: 62,
              maxWidth: 76,
              flex: 1,
              px: 0.5,
              py: 0.8,
              borderRadius: 0,
              flexDirection: 'column',
              justifyContent: 'center',
              color: 'primary.main',
            }}
          >
            <ListItemIcon sx={{ minWidth: 0, mb: 0.25, color: 'inherit' }}>
              <LoginRoundedIcon />
            </ListItemIcon>
            <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.62rem' }}>
              {t('auth.submitLogin')}
            </Typography>
          </ListItemButton>
        )}
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
        backgroundColor: (th) =>
          th.palette.mode === 'dark' ? colorTokens.hero.darkBg : colorTokens.hero.lightBg,
        borderRight: '1px solid',
        borderRightColor: (th) => (th.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'transparent'),
      }}
    >
      <Box sx={{ px: spacingTokens.block_inner_padding_normal.sm, pt: 3, pb: spacingTokens.section_vertical_gap }}>
        <Brand />
      </Box>

      <Box sx={{ px: spacingTokens.block_inner_padding_compact.sm, pb: 1 }}>
        <Typography variant="overline" sx={{ color: alpha('#FFFFFF', 0.42), fontSize: '0.64rem' }}>
          {t('nav.workspace')}
        </Typography>
      </Box>

      <List sx={{ px: spacingTokens.element_group_gap * 1.5, pt: 0, flexGrow: 1 }}>
        {currentNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          const isDisabled = item.path === '/quiz' && !hasWords;
          const button = (
            <ListItemButton
              key={item.path}
              component={isDisabled ? 'button' : NavLink}
              to={isDisabled ? undefined : item.path}
              disabled={isDisabled}
              data-tour={item.path === '/quiz' ? 'nav-quiz' : undefined}
              onClick={() => {
                if (item.path === '/quiz') {
                  useGuidelineStore.getState().advanceStep('step4_nav_quiz');
                }
              }}
              sx={{
                position: 'relative',
                minHeight: 48,
                mb: spacingTokens.element_group_gap,
                px: spacingTokens.element_group_gap * 1.5,
                borderRadius: `${radiusTokens.md}px`,
                color: isDisabled ? alpha('#FFFFFF', 0.28) : isActive ? '#FFFFFF' : alpha('#FFFFFF', 0.65),
                backgroundColor: isActive ? alpha('#FFFFFF', 0.12) : 'transparent',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                '&:hover': {
                  color: isDisabled ? alpha('#FFFFFF', 0.28) : '#FFFFFF',
                  backgroundColor: isDisabled ? 'transparent' : alpha('#FFFFFF', isActive ? 0.15 : 0.075),
                }
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

          if (isDisabled) {
            return (
              <Tooltip key={item.path} title={t('nav.quizLockedTooltip')} placement="right">
                <Box component="div" sx={{ display: 'block' }}>
                  {button}
                </Box>
              </Tooltip>
            );
          }

          return button;
        })}
      </List>

      <Box sx={{ p: 2.25, borderTop: '1px solid rgba(255, 255, 255, 0.12)' }}>
        {token ? (
          <>
            {profile && (
              <Box sx={{ px: 1.25, pb: 1.5 }}>
                <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.5), display: 'block', mb: 0.25 }}>
                  {t('nav.learningAs')}
                </Typography>
                <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 800 }} noWrap>
                  {profile.username}
                </Typography>
              </Box>
            )}
            <ListItemButton
              onClick={handleLogout}
              sx={{
                minHeight: 44,
                borderRadius: `${radiusTokens.md}px`,
                px: spacingTokens.element_group_gap * 1.5,
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
                primary={<Typography sx={{ fontSize: '0.875rem', fontWeight: 700 }}>{t('nav.signOut')}</Typography>}
              />
            </ListItemButton>
          </>
        ) : (
          <>
            <Box sx={{ px: 1.25, pb: 1.5 }}>
              <Chip
                size="small"
                label={t('guest.badge')}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  borderRadius: `${radiusTokens.sm}px`,
                }}
              />
            </Box>
            <ListItemButton
              component={NavLink}
              to="/login"
              data-testid="sidebar-login-btn"
              sx={{
                minHeight: 44,
                borderRadius: `${radiusTokens.md}px`,
                px: spacingTokens.element_group_gap * 1.5,
                color: '#FFFFFF',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                '&:hover': {
                  color: '#FFFFFF',
                  backgroundColor: 'rgba(255, 255, 255, 0.22)',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 39, color: 'inherit' }}>
                <LoginRoundedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={<Typography sx={{ fontSize: '0.875rem', fontWeight: 800 }}>{t('auth.submitLogin')}</Typography>}
              />
            </ListItemButton>
          </>
        )}
      </Box>
    </Box>
  );
}
