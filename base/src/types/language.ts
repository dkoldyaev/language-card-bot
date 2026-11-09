import { z } from 'zod';
import { env } from '../core/env';

export const ALL_KNOWN_LANGUAGES = [
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

export type LanguageCode = (typeof ALL_KNOWN_LANGUAGES)[number];

const parsedLangs = env.SUPPORTED_LANGUAGES.split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const invalidLangs = parsedLangs.filter(
  (l) => !(ALL_KNOWN_LANGUAGES as readonly string[]).includes(l)
);

if (parsedLangs.length === 0 || invalidLangs.length > 0) {
  throw new Error(
    `Invalid SUPPORTED_LANGUAGES in environment: "${env.SUPPORTED_LANGUAGES}". Must be non-empty comma-separated subset of: ${ALL_KNOWN_LANGUAGES.join(', ')}`
  );
}

export const SUPPORTED_LANGUAGES = parsedLangs as [LanguageCode, ...LanguageCode[]];

export const LanguageCodeSchema = z.enum(SUPPORTED_LANGUAGES);

