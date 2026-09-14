import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../../../shared/api/client';
import { I18nProvider, NATIVE_LANGUAGE_COOKIE } from '../../../shared/i18n';
import { getCookie, setCookie } from '../../../shared/lib/cookie';
import CreateDictionaryDialog from './CreateDictionaryDialog';

function TestWrapper({ initialLocale = 'en', children }: { initialLocale?: string; children: React.ReactNode }) {
  setCookie('locale', initialLocale);
  return <I18nProvider>{children}</I18nProvider>;
}

describe('CreateDictionaryDialog - native language defaults and cookie persistence', () => {
  beforeEach(() => {
    // Clear cookies
    document.cookie.split(';').forEach((c) => {
      document.cookie = c.replace(/^ +/, '').replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults native language to the current active locale when no cookie is set', () => {
    render(
      <TestWrapper initialLocale="ru">
        <CreateDictionaryDialog open={true} onClose={vi.fn()} />
      </TestWrapper>
    );

    const nativeSelect = screen.getByTestId('dialog-native-language-select');
    expect(nativeSelect).toHaveValue('ru');
  });

  it('defaults native language to de when locale is de', () => {
    render(
      <TestWrapper initialLocale="de">
        <CreateDictionaryDialog open={true} onClose={vi.fn()} />
      </TestWrapper>
    );

    const nativeSelect = screen.getByTestId('dialog-native-language-select');
    expect(nativeSelect).toHaveValue('de');
  });

  it('saves selected native language to separate cookie when changed manually', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper initialLocale="en">
        <CreateDictionaryDialog open={true} onClose={vi.fn()} />
      </TestWrapper>
    );

    const nativeSelect = screen.getByTestId('dialog-native-language-select');
    expect(nativeSelect).toHaveValue('en');
    expect(getCookie(NATIVE_LANGUAGE_COOKIE)).toBeNull();

    // Change native language to French (fr)
    const selectTrigger = screen.getByLabelText(/Explanations \/ Native Language/i);
    await user.click(selectTrigger);

    const frOption = screen.getByRole('option', { name: /French \(FR\)/i });
    await user.click(frOption);

    expect(nativeSelect).toHaveValue('fr');
    expect(getCookie(NATIVE_LANGUAGE_COOKIE)).toBe('fr');
  });

  it('uses saved native language cookie on subsequent opens even if locale is different', () => {
    setCookie(NATIVE_LANGUAGE_COOKIE, 'ja');

    render(
      <TestWrapper initialLocale="es">
        <CreateDictionaryDialog open={true} onClose={vi.fn()} />
      </TestWrapper>
    );

    const nativeSelect = screen.getByTestId('dialog-native-language-select');
    expect(nativeSelect).toHaveValue('ja');
  });

  it('submits dictionary with selected languages', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: {
        dictionary: {
          id: 10,
          name: 'German (RU)',
          targetLanguage: 'de',
          baseLanguage: 'ru',
          wordCount: 0,
          isActive: false,
        },
      },
    });

    render(
      <TestWrapper initialLocale="en">
        <CreateDictionaryDialog open={true} onClose={vi.fn()} onCreated={onCreated} />
      </TestWrapper>
    );

    // Target language select
    const targetTrigger = screen.getByLabelText(/Language to Learn \(Target\)/i);
    await user.click(targetTrigger);
    await user.click(screen.getByRole('option', { name: /German \(DE\)/i }));

    // Submit
    const createBtn = screen.getByRole('button', { name: /Create Dictionary/i });
    await user.click(createBtn);

    expect(postSpy).toHaveBeenCalledWith('/dictionaries', {
      name: undefined,
      targetLanguage: 'de',
      baseLanguage: 'en',
    });
    await waitFor(() => {
      expect(onCreated).toHaveBeenCalled();
    });
  });
});
