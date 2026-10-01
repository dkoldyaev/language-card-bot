import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppThemeProvider from '../../app/AppThemeProvider';
import { I18nProvider } from '../i18n';
import UpdateNotification from './UpdateNotification';

describe('UpdateNotification', () => {
  it('does not render when update is not available', () => {
    const { container } = render(
      <I18nProvider>
        <AppThemeProvider>
          <UpdateNotification isUpdateAvailable={false} onUpdate={vi.fn()} />
        </AppThemeProvider>
      </I18nProvider>
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByText('A new version of the app is available.')).not.toBeInTheDocument();
  });

  it('renders notification and button when update is available', () => {
    const handleUpdate = vi.fn();

    render(
      <I18nProvider>
        <AppThemeProvider>
          <UpdateNotification isUpdateAvailable={true} onUpdate={handleUpdate} />
        </AppThemeProvider>
      </I18nProvider>
    );

    expect(screen.getByText('A new version of the app is available.')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /update now/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleUpdate).toHaveBeenCalledTimes(1);
  });
});
