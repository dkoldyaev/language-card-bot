import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { type ReactNode, useEffect, useMemo } from 'react';
import useStore from '../store/useStore';
import { createAppTheme } from './theme';

interface AppThemeProviderProps {
  children: ReactNode;
}

export default function AppThemeProvider({ children }: AppThemeProviderProps) {
  const themeMode = useStore((state) => state.themeMode);
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const resolvedMode: 'light' | 'dark' =
    themeMode === 'system'
      ? (prefersDarkMode ? 'dark' : 'light')
      : (themeMode === 'dark' ? 'dark' : 'light');

  const theme = useMemo(() => createAppTheme(resolvedMode), [resolvedMode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedMode);
    document.documentElement.style.colorScheme = resolvedMode;
  }, [resolvedMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
