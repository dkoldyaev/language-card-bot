import { alpha, createTheme, type Theme } from '@mui/material/styles';
import { colorTokens, radiusTokens } from '../shared/ui/tokens';

const ink = colorTokens.brand.ink;
const blue = colorTokens.brand.blue;
const coral = colorTokens.brand.coral;
const paper = colorTokens.brand.paper;

export function createAppTheme(mode: 'light' | 'dark' = 'light'): Theme {
  const isDark = mode === 'dark';

  const primaryMain = isDark ? '#4D7FE3' : blue;
  const primaryLight = isDark ? '#789FEF' : '#4776C8';
  const primaryDark = isDark ? '#2453A6' : '#163872';

  const secondaryMain = isDark ? '#F07D5A' : coral;
  const secondaryLight = isDark ? '#F5A187' : '#ED8B6C';
  const secondaryDark = isDark ? '#C44E28' : '#A8462A';

  const bgDefault = isDark ? '#0E131F' : paper;
  const bgPaper = isDark ? '#181F2E' : '#FFFFFF';
  const textPrimary = isDark ? '#F1F5F9' : ink;
  const textSecondary = isDark ? '#94A3B8' : '#647084';
  const dividerColor = isDark ? 'rgba(255, 255, 255, 0.09)' : '#DDDCD5';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.14)' : '#C9CED7';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: primaryMain,
        light: primaryLight,
        dark: primaryDark,
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: secondaryMain,
        light: secondaryLight,
        dark: secondaryDark,
        contrastText: '#FFFFFF',
      },
      success: isDark
        ? { main: '#34D399', light: '#064E3B', dark: '#065F46' }
        : { main: '#24756D', light: '#DFF2EA', dark: '#15554F' },
      warning: isDark
        ? { main: '#FBBF24', light: '#78350F', dark: '#92400E' }
        : { main: '#A96513', light: '#FFF0D4', dark: '#784400' },
      error: isDark
        ? { main: '#F87171', light: '#7F1D1D', dark: '#991B1B' }
        : { main: '#B94343', light: '#FCE8E7', dark: '#852D30' },
      background: {
        default: bgDefault,
        paper: bgPaper,
      },
      text: {
        primary: textPrimary,
        secondary: textSecondary,
      },
      divider: dividerColor,
    },
    typography: {
      fontFamily: '"Manrope", "Inter", "Segoe UI", sans-serif',
      h1: {
        fontFamily: '"Fraunces", Georgia, serif',
        fontWeight: 650,
        letterSpacing: '-0.045em',
        lineHeight: 1.06,
      },
      h2: {
        fontFamily: '"Fraunces", Georgia, serif',
        fontWeight: 650,
        letterSpacing: '-0.04em',
        lineHeight: 1.1,
      },
      h3: {
        fontFamily: '"Fraunces", Georgia, serif',
        fontWeight: 650,
        letterSpacing: '-0.03em',
      },
      h4: {
        fontFamily: '"Fraunces", Georgia, serif',
        fontWeight: 650,
        letterSpacing: '-0.03em',
      },
      h5: { fontWeight: 750, letterSpacing: '-0.025em' },
      h6: { fontWeight: 750, letterSpacing: '-0.015em' },
      subtitle1: { fontWeight: 700, lineHeight: 1.45 },
      body1: { lineHeight: 1.65 },
      body2: { lineHeight: 1.55 },
      button: { fontWeight: 750, textTransform: 'none', letterSpacing: '0' },
      overline: { fontWeight: 800, letterSpacing: '0.11em', lineHeight: 1.45 },
    },
    shape: { borderRadius: radiusTokens.lg },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: bgDefault,
            backgroundImage: `radial-gradient(${alpha(primaryMain, isDark ? 0.08 : 0.055)} 1px, transparent 1px)`,
            backgroundSize: '22px 22px',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            minHeight: 44,
            borderRadius: radiusTokens.md,
            padding: '10px 18px',
            boxShadow: 'none',
            transition: 'background-color 160ms ease, border-color 160ms ease, color 160ms ease',
            '&.MuiButton-containedSecondary:hover': {
              backgroundColor: isDark ? '#D96542' : '#B95030',
            },
          },
          contained: {
            '&:hover': { boxShadow: 'none' },
          },
          outlined: {
            borderColor: borderColor,
            '&:hover': {
              borderColor: primaryMain,
              backgroundColor: alpha(primaryMain, isDark ? 0.12 : 0.055),
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: radiusTokens.xl,
            border: `1px solid ${dividerColor}`,
            backgroundColor: bgPaper,
            boxShadow: isDark
              ? '0 10px 28px rgba(0, 0, 0, 0.4)'
              : '0 10px 28px rgba(23, 32, 51, 0.055)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: bgPaper,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: radiusTokens.md,
              backgroundColor: bgPaper,
              '& fieldset': { borderColor: borderColor },
              '&:hover fieldset': {
                borderColor: isDark ? 'rgba(255, 255, 255, 0.35)' : '#8792A5',
              },
              '&.Mui-focused fieldset': {
                borderColor: primaryMain,
                borderWidth: 2,
              },
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            borderRadius: radiusTokens.md,
            backgroundColor: bgPaper,
          },
        },
      },
      MuiChip: {
        styleOverrides: { root: { borderRadius: radiusTokens.sm, fontWeight: 750 } },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            minWidth: 40,
            minHeight: 40,
            borderRadius: '50%',
            '&:hover': { backgroundColor: alpha(primaryMain, isDark ? 0.12 : 0.06) },
          },
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            overflow: 'hidden',
            border: `1px solid ${dividerColor}`,
            borderRadius: '16px !important',
            backgroundColor: bgPaper,
            boxShadow: 'none',
            marginBottom: 10,
            '&::before': { display: 'none' },
            '&.Mui-expanded': { margin: '0 0 10px' },
          },
        },
      },
      MuiAccordionSummary: {
        styleOverrides: {
          root: {
            minHeight: 64,
            '&.Mui-expanded': { minHeight: 64 },
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FAFAF8',
            },
          },
          content: { '&.Mui-expanded': { margin: '12px 0' } },
        },
      },
      MuiAlert: {
        styleOverrides: { root: { borderRadius: 14 } },
      },
      MuiTooltip: {
        styleOverrides: { tooltip: { borderRadius: 8, fontSize: '0.75rem' } },
      },
    },
  });
}

const theme = createAppTheme('light');
export default theme;
