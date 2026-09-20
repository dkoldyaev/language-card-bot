export const SUPPORTED_LANGUAGES = [
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

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number];
