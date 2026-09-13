import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  type SupportedLocale,
  type LocaleInfo,
  SUPPORTED_LOCALES,
  LOCALES_INFO,
} from './types';
import { translations } from './translations';
import { getCookie, setCookie } from '../lib/cookie';

const COOKIE_NAME = 'locale';

export interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  locales: LocaleInfo[];
  currentLocaleInfo: LocaleInfo;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function isSupportedLocale(lang: string | null | undefined): lang is SupportedLocale {
  if (!lang) return false;
  return (SUPPORTED_LOCALES as readonly string[]).includes(lang.toLowerCase());
}

/**
 * Detect language from browser headers / navigator preferences
 */
export function detectBrowserLanguage(): SupportedLocale {
  if (typeof navigator === 'undefined') return 'en';

  const languages: readonly string[] =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language || 'en'];

  for (const raw of languages) {
    if (!raw) continue;
    const base = raw.toLowerCase().split(/[-_]/)[0];
    if (isSupportedLocale(base)) {
      return base;
    }
  }

  return 'en';
}

/**
 * Resolve initial locale:
 * 1. Check cookies for 'locale'
 * 2. If undefined/invalid, detect from browser headers/navigator and persist into cookies
 */
export function getInitialLocale(): SupportedLocale {
  const cookieLocale = getCookie(COOKIE_NAME);
  if (isSupportedLocale(cookieLocale)) {
    return cookieLocale;
  }

  // If cookie is not defined, detect from browser and save to cookie
  const detected = detectBrowserLanguage();
  setCookie(COOKIE_NAME, detected, 365);
  return detected;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => getInitialLocale());

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    setCookie(COOKIE_NAME, newLocale, 365);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLocale;
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const activeDict = translations[locale] || translations.en;
      const fallbackDict = translations.en;

      let template = activeDict[key] ?? fallbackDict[key] ?? key;

      if (params) {
        for (const [paramKey, value] of Object.entries(params)) {
          template = template.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), String(value));
        }
      }

      return template;
    },
    [locale]
  );

  const locales = useMemo(() => SUPPORTED_LOCALES.map((code) => LOCALES_INFO[code]), []);
  const currentLocaleInfo = useMemo(() => LOCALES_INFO[locale] || LOCALES_INFO.en, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      locales,
      currentLocaleInfo,
    }),
    [locale, setLocale, t, locales, currentLocaleInfo]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

const defaultT = (key: string, params?: Record<string, string | number>) => {
  let text = translations.en[key] || key;
  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      text = text.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
    });
  }
  return text;
};

const defaultLocales = SUPPORTED_LOCALES.map((code) => LOCALES_INFO[code]);

const defaultContextValue: I18nContextValue = {
  locale: 'en',
  setLocale: () => {},
  t: defaultT,
  locales: defaultLocales,
  currentLocaleInfo: LOCALES_INFO.en,
};

export function useTranslation(): I18nContextValue {
  const context = useContext(I18nContext);
  return context || defaultContextValue;
}



