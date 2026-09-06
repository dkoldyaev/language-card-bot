import { alpha, createTheme } from '@mui/material/styles';

const ink = '#172033';
const blue = '#2453A6';
const coral = '#D86642';
const paper = '#F7F5EF';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: blue,
      light: '#4776C8',
      dark: '#163872',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: coral,
      light: '#ED8B6C',
      dark: '#A8462A',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#24756D',
      light: '#DFF2EA',
      dark: '#15554F',
    },
    warning: {
      main: '#A96513',
      light: '#FFF0D4',
      dark: '#784400',
    },
    error: {
      main: '#B94343',
      light: '#FCE8E7',
      dark: '#852D30',
    },
    background: {
      default: paper,
      paper: '#FFFFFF',
    },
    text: {
      primary: ink,
      secondary: '#647084',
    },
    divider: '#DDDCD5',
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
  shape: { borderRadius: 14 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: paper,
          backgroundImage: `radial-gradient(${alpha('#2453A6', 0.055)} 1px, transparent 1px)`,
          backgroundSize: '22px 22px',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 44,
          borderRadius: 12,
          padding: '10px 18px',
          boxShadow: 'none',
          transition: 'background-color 160ms ease, border-color 160ms ease, color 160ms ease',
          '&.MuiButton-containedSecondary:hover': { backgroundColor: '#B95030' },
        },
        contained: {
          '&:hover': { boxShadow: 'none' },
        },
        outlined: {
          borderColor: '#C7CBD4',
          '&:hover': {
            borderColor: blue,
            backgroundColor: alpha(blue, 0.055),
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          border: '1px solid #E1E0DA',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 10px 28px rgba(23, 32, 51, 0.055)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: '#FFFFFF',
            '& fieldset': { borderColor: '#C9CED7' },
            '&:hover fieldset': { borderColor: '#8792A5' },
            '&.Mui-focused fieldset': {
              borderColor: blue,
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: { root: { borderRadius: 12, backgroundColor: '#FFFFFF' } },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 8, fontWeight: 750 } },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 40,
          minHeight: 40,
          borderRadius: 10,
          '&:hover': { backgroundColor: alpha(blue, 0.06) },
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          overflow: 'hidden',
          border: '1px solid #E1E0DA',
          borderRadius: '16px !important',
          backgroundColor: '#FFFFFF',
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
          '&:hover': { backgroundColor: '#FAFAF8' },
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

export default theme;
