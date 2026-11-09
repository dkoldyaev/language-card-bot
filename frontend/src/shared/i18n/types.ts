export const ALL_AVAILABLE_LANGUAGES = [
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
  'uk',
] as const;

export type LanguageCode = (typeof ALL_AVAILABLE_LANGUAGES)[number];
export type SupportedLocale = LanguageCode;

const rawEnvLanguages = import.meta.env.VITE_SUPPORTED_LANGUAGES;
if (!rawEnvLanguages) {
  throw new Error('VITE_SUPPORTED_LANGUAGES is required');
}

const parsedEnvLangs = rawEnvLanguages
  .split(',')
  .map((s: string) => s.trim().toLowerCase())
  .filter(Boolean);

const invalidEnvLangs = parsedEnvLangs.filter(
  (l: string) => !(ALL_AVAILABLE_LANGUAGES as readonly string[]).includes(l)
);

if (parsedEnvLangs.length === 0 || invalidEnvLangs.length > 0) {
  throw new Error(
    `Invalid VITE_SUPPORTED_LANGUAGES: "${rawEnvLanguages}". Must be non-empty comma-separated subset of: ${ALL_AVAILABLE_LANGUAGES.join(', ')}`
  );
}

export const SUPPORTED_LANGUAGES = parsedEnvLangs as LanguageCode[];
export const SUPPORTED_LOCALES = SUPPORTED_LANGUAGES;

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
  uk: { code: 'uk', label: 'Ukrainian', nativeLabel: 'Українська', flag: '🇺🇦' },
};

export type TranslationDictionary = Record<string, string>;
