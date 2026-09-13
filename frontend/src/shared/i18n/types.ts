export const SUPPORTED_LOCALES = [
  'en',
  'ru',
  'es',
  'de',
  'fr',
  'it',
  'pt',
  'zh',
  'ja',
  'tr',
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export interface LocaleInfo {
  code: SupportedLocale;
  label: string;
  nativeLabel: string;
  flag: string;
}

export const LOCALES_INFO: Record<SupportedLocale, LocaleInfo> = {
  en: { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  ru: { code: 'ru', label: 'Russian', nativeLabel: 'Русский', flag: '🇷🇺' },
  es: { code: 'es', label: 'Spanish', nativeLabel: 'Español', flag: '🇪🇸' },
  de: { code: 'de', label: 'German', nativeLabel: 'Deutsch', flag: '🇩🇪' },
  fr: { code: 'fr', label: 'French', nativeLabel: 'Français', flag: '🇫🇷' },
  it: { code: 'it', label: 'Italian', nativeLabel: 'Italiano', flag: '🇮🇹' },
  pt: { code: 'pt', label: 'Portuguese', nativeLabel: 'Português', flag: '🇵🇹' },
  zh: { code: 'zh', label: 'Chinese', nativeLabel: '中文', flag: '🇨🇳' },
  ja: { code: 'ja', label: 'Japanese', nativeLabel: '日本語', flag: '🇯🇵' },
  tr: { code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe', flag: '🇹🇷' },
};

export type TranslationDictionary = Record<string, string>;
