import { createTheme, alpha } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7C3AED',      // Vibrant purple
      light: '#A78BFA',
      dark: '#5B21B6',
    },
    secondary: {
      main: '#06B6D4',      // Cyan
      light: '#22D3EE',
      dark: '#0891B2',
    },
    success: {
      main: '#10B981',
      light: '#34D399',
    },
    warning: {
      main: '#F59E0B',
      light: '#FBBF24',
    },
    error: {
      main: '#EF4444',
      light: '#F87171',
    },
    background: {
      default: '#0B0E14',
      paper: '#111827',
    },
    text: {
      primary: '#F3F4F6',
      secondary: '#9CA3AF',
    },
    divider: alpha('#6B7280', 0.2),
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.025em',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.025em',
    },
    h3: {
      fontWeight: 600,
      letterSpacing: '-0.015em',
    },
    h4: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none' as const,
      letterSpacing: '0.01em',
    },
    body1: {
      lineHeight: 1.7,
    },
    body2: {
      lineHeight: 1.6,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage: `
            radial-gradient(ellipse at 20% 50%, ${alpha('#7C3AED', 0.08)} 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, ${alpha('#06B6D4', 0.06)} 0%, transparent 50%),
            radial-gradient(ellipse at 50% 80%, ${alpha('#7C3AED', 0.04)} 0%, transparent 50%)
          `,
          backgroundAttachment: 'fixed',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 20px',
          fontSize: '0.875rem',
          transition: 'all 0.2s ease',
        },
        contained: {
          boxShadow: `0 4px 14px ${alpha('#7C3AED', 0.4)}`,
          '&:hover': {
            boxShadow: `0 6px 20px ${alpha('#7C3AED', 0.5)}`,
            transform: 'translateY(-1px)',
          },
        },
        outlined: {
          borderColor: alpha('#A78BFA', 0.3),
          '&:hover': {
            borderColor: '#A78BFA',
            backgroundColor: alpha('#7C3AED', 0.08),
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: `1px solid ${alpha('#6B7280', 0.15)}`,
          backgroundColor: alpha('#111827', 0.7),
          backdropFilter: 'blur(20px)',
          boxShadow: `0 8px 32px ${alpha('#000', 0.3)}`,
          transition: 'all 0.3s ease',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            '& fieldset': {
              borderColor: alpha('#6B7280', 0.3),
              transition: 'border-color 0.2s ease',
            },
            '&:hover fieldset': {
              borderColor: alpha('#A78BFA', 0.5),
            },
            '&.Mui-focused fieldset': {
              borderColor: '#7C3AED',
              boxShadow: `0 0 0 3px ${alpha('#7C3AED', 0.15)}`,
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'scale(1.1)',
          },
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: '12px !important',
          border: `1px solid ${alpha('#6B7280', 0.15)}`,
          backgroundColor: alpha('#111827', 0.5),
          backdropFilter: 'blur(10px)',
          marginBottom: 8,
          '&:before': {
            display: 'none',
          },
          '&.Mui-expanded': {
            margin: '0 0 8px 0',
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          '&:hover': {
            backgroundColor: alpha('#7C3AED', 0.05),
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
  },
});

export default theme;
