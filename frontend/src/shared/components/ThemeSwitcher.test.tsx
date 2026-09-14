import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import AppThemeProvider from '../../app/AppThemeProvider';
import useStore from '../../store/useStore';
import { I18nProvider } from '../i18n';
import ThemeSwitcher from './ThemeSwitcher';

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    useStore.setState({ themeMode: 'light' });
  });

  it('renders theme toggle button', () => {
    render(
      <I18nProvider>
        <AppThemeProvider>
          <ThemeSwitcher />
        </AppThemeProvider>
      </I18nProvider>
    );

    const button = screen.getByTestId('theme-toggle');
    expect(button).toBeInTheDocument();
  });

  it('toggles theme between light and dark when clicked', () => {
    render(
      <I18nProvider>
        <AppThemeProvider>
          <ThemeSwitcher />
        </AppThemeProvider>
      </I18nProvider>
    );

    const button = screen.getByTestId('theme-toggle');
    expect(useStore.getState().themeMode).toBe('light');

    fireEvent.click(button);
    expect(useStore.getState().themeMode).toBe('dark');

    fireEvent.click(button);
    expect(useStore.getState().themeMode).toBe('light');
  });
});
