import { z } from 'zod';

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

export const LanguageCodeSchema = z.enum(SUPPORTED_LANGUAGES);

export type LanguageCode = z.infer<typeof LanguageCodeSchema>;
