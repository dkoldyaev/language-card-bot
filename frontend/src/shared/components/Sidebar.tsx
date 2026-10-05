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
import { useState } from 'react';
import { NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import CreateDictionaryDialog from '../../features/dictionary/components/CreateDictionaryDialog';
import { useGuidelineStore } from '../../features/guideline';
import useStore from '../../store/useStore';
import { useActiveDictionaryId } from '../hooks/useActiveDictionaryId';
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
          <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.8), display: 'block', mt: 0.2 }}>
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
  const { locale } = useParams();
  if (!locale) {
    throw new Error('Locale is required for Sidebar');
  }
  const loc = locale;

  const dictionaries = useStore((state) => state.dictionaries);
  const activeDictionaryId = useActiveDictionaryId();
  const targetDictId = activeDictionaryId ?? dictionaries[0]?.id;

  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const dictionaryPath = targetDictId ? `/${loc}/dictionary/${targetDictId}` : undefined;
  const quizPath = targetDictId ? `/${loc}/quiz/${targetDictId}` : undefined;

  const handleActionClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setCreateDialogOpen(true);
  };

  const navItems = [
    { id: 'dashboard', path: `/${loc}`, label: t('nav.dashboard'), icon: <HomeRoundedIcon /> },
    { id: 'dictionary', path: dictionaryPath, label: t('nav.dictionary'), icon: <MenuBookRoundedIcon />, isAction: !targetDictId },
    { id: 'quiz', path: quizPath, label: t('nav.quiz'), icon: <SchoolRoundedIcon />, isAction: !targetDictId },
  ];

  const isAdmin = Boolean(profile?.isAdmin || profile?.is_admin);
  if (token && isAdmin) {
    navItems.push({ id: 'presets', path: `/${loc}/presets`, label: t('nav.presets'), icon: <AutoAwesomeRoundedIcon /> });
  }

  const hasWords = dictionary.length > 0;
  const currentNavItems = navItems;

  const handleLogout = () => {
    reset();
    navigate(`/${loc}`);
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
          const isActive = item.path !== undefined && location.pathname === item.path;
          const isQuizItem = item.id === 'quiz';
          const isDisabled = isQuizItem && !hasWords;
          const button = (
            <ListItemButton
              key={item.id}
              component={item.isAction ? 'button' : (isDisabled ? 'button' : NavLink)}
              to={item.isAction || isDisabled ? undefined : item.path}
              disabled={isDisabled}
              aria-label={item.label}
              data-tour={isQuizItem ? 'nav-quiz' : undefined}
              onClick={(e: React.MouseEvent) => {
                if (item.isAction) {
                  handleActionClick(e);
                  return;
                }
                if (isQuizItem) {
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
              <Tooltip key={item.id} title={t('nav.quizLockedTooltip')} placement="top">
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
        <CreateDictionaryDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onCreated={(newDict) => {
            navigate(`/${loc}/dictionary/${newDict.id}`);
          }}
        />
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
        <Typography variant="overline" sx={{ color: alpha('#FFFFFF', 0.78), fontSize: '0.64rem' }}>
          {t('nav.workspace')}
        </Typography>
      </Box>

      <List component="div" sx={{ px: spacingTokens.element_group_gap * 1.5, pt: 0, flexGrow: 1 }}>
        {currentNavItems.map((item) => {
          const isActive = item.path !== undefined && location.pathname === item.path;
          const isQuizItem = item.id === 'quiz';
          const isDisabled = isQuizItem && !hasWords;
          const button = (
            <ListItemButton
              key={item.id}
              component={item.isAction ? 'button' : (isDisabled ? 'button' : NavLink)}
              to={item.isAction || isDisabled ? undefined : item.path}
              disabled={isDisabled}
              onClick={(e: React.MouseEvent) => {
                if (item.isAction) {
                  handleActionClick(e);
                  return;
                }
                if (isQuizItem) {
                  useGuidelineStore.getState().advanceStep('step4_nav_quiz');
                }
              }}
              sx={{
                position: 'relative',
                minHeight: 48,
                mb: spacingTokens.element_group_gap,
                px: spacingTokens.element_group_gap * 1.5,
                borderRadius: `${radiusTokens.md}px`,
                color: isDisabled ? alpha('#FFFFFF', 0.38) : isActive ? '#FFFFFF' : alpha('#FFFFFF', 0.88),
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
              <Tooltip key={item.id} title={t('nav.quizLockedTooltip')} placement="right">
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
                <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.78), display: 'block', mb: 0.25 }}>
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
                color: alpha('#FFFFFF', 0.88),
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

      <CreateDictionaryDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={(newDict) => {
          navigate(`/${loc}/dictionary/${newDict.id}`);
        }}
      />
    </Box>
  );
}
