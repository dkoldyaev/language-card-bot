import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LocaleSwitcher from '../components/LocaleSwitcher';
import { getCookie, setCookie } from '../lib/cookie';
import { detectBrowserLanguage, I18nProvider, useTranslation } from './I18nContext';
import translations from './translations';
import { SUPPORTED_LOCALES } from './types';

function TestConsumer() {
  const { locale, setLocale, t } = useTranslation();
  return (
    <div>
      <span data-testid="current-locale">{locale}</span>
      <span data-testid="translated-title">{t('dashboard.readyTitle')}</span>
      <span data-testid="interpolated">{t('dashboard.welcomeUser', { name: 'Alex' })}</span>
      <button type="button" onClick={() => setLocale('ru')}>Set RU</button>
      <button type="button" onClick={() => setLocale('es')}>Set ES</button>
      <button type="button" onClick={() => setLocale('de')}>Set DE</button>
    </div>
  );
}

describe('i18n infrastructure', () => {
  beforeEach(() => {
    // Clear cookies
    document.cookie.split(';').forEach((c) => {
      // biome-ignore lint/suspicious/noDocumentCookie: required for test cleanup
      document.cookie = c.replace(/^ +/, '').replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('cookie helpers', () => {
    it('sets and gets cookie correctly', () => {
      expect(getCookie('test_cookie')).toBeNull();
      setCookie('test_cookie', 'hello_world');
      expect(getCookie('test_cookie')).toBe('hello_world');
    });
  });

  describe('all 10 languages supported and have translations', () => {
    it('supports exactly the 10 available languages', () => {
      expect(SUPPORTED_LOCALES).toEqual(['en', 'ru', 'es', 'de', 'fr', 'it', 'pt', 'zh', 'ja', 'tr']);
    });

    it('contains translation dictionary for all 10 locales', () => {
      const enKeys = Object.keys(translations.en);
      for (const loc of SUPPORTED_LOCALES) {
        expect(translations[loc]).toBeDefined();
        expect(typeof translations[loc]).toBe('object');
        for (const key of enKeys) {
          expect(translations[loc][key], `Missing or empty key "${key}" in "${loc}"`).toBeTruthy();
        }
      }
    });
  });

  describe('browser language detection', () => {
    it('detects primary language matching supported locale', () => {
      vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['ru-RU', 'ru', 'en-US', 'en']);
      expect(detectBrowserLanguage()).toBe('ru');
    });

    it('detects second language in list if first is unsupported', () => {
      vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['pl-PL', 'de-DE', 'en']);
      expect(detectBrowserLanguage()).toBe('de');
    });

    it('detects from navigator.language when languages array is empty', () => {
      vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue([]);
      vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('fr-FR');
      expect(detectBrowserLanguage()).toBe('fr');
    });

    it('falls back to "en" when no supported language matches', () => {
      vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['pl', 'uk', 'fi']);
      vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('fi');
      expect(detectBrowserLanguage()).toBe('en');
    });
  });

  describe('I18nProvider initialization and cookie persistence', () => {
    it('loads saved locale from cookie if present', () => {
      setCookie('locale', 'es');

      render(
        <I18nProvider>
          <TestConsumer />
        </I18nProvider>
      );

      expect(screen.getByTestId('current-locale').textContent).toBe('es');
      expect(getCookie('locale')).toBe('es');
    });

    it('detects from browser and writes to cookie if cookie is missing', () => {
      vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['de-DE', 'en']);

      render(
        <I18nProvider>
          <TestConsumer />
        </I18nProvider>
      );

      expect(screen.getByTestId('current-locale').textContent).toBe('de');
      // Must save to cookie
      expect(getCookie('locale')).toBe('de');
    });

    it('updates cookie and state when setLocale is called', async () => {
      const user = userEvent.setup();
      setCookie('locale', 'en');

      render(
        <I18nProvider>
          <TestConsumer />
        </I18nProvider>
      );

      expect(screen.getByTestId('current-locale').textContent).toBe('en');

      await user.click(screen.getByText('Set RU'));
      expect(screen.getByTestId('current-locale').textContent).toBe('ru');
      expect(getCookie('locale')).toBe('ru');
      expect(screen.getByTestId('interpolated').textContent).toBe('Добро пожаловать, Alex.');

      await user.click(screen.getByText('Set ES'));
      expect(screen.getByTestId('current-locale').textContent).toBe('es');
      expect(getCookie('locale')).toBe('es');
    });
  });

  describe('LocaleSwitcher component', () => {
    it('renders current language and switches language on selection', async () => {
      const user = userEvent.setup();
      setCookie('locale', 'en');

      render(
        <I18nProvider>
          <LocaleSwitcher />
          <TestConsumer />
        </I18nProvider>
      );

      // Current locale button should have aria-label
      const switcherBtn = screen.getByTestId('locale-switcher-button');
      expect(switcherBtn).toBeInTheDocument();

      // Open menu
      await user.click(switcherBtn);

      // Click on Deutsch
      const deOption = screen.getByTestId('locale-option-de');
      expect(deOption).toBeInTheDocument();
      await user.click(deOption);

      expect(getCookie('locale')).toBe('de');
      expect(screen.getByTestId('current-locale').textContent).toBe('de');
    });
  });
});
