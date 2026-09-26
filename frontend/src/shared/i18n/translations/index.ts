import { z } from 'zod';
import type { SupportedLocale, TranslationDictionary } from '../types';
import de from './de';
import en from './en';
import es from './es';
import fr from './fr';
import it from './it';
import ja from './ja';
import pt from './pt';
import ru from './ru';
import tr from './tr';
import zh from './zh';

// 1. Zod schema based on English keys as the source of truth
const enKeys = Object.keys(en) as [string, ...string[]];
const shape: Record<string, z.ZodString> = {};
for (const key of enKeys) {
  shape[key] = z.string().min(1, `Empty translation for key: ${key}`);
}

const TranslationSchema = z.object(shape).strict();

const validateDictionary = (lang: string, dict: any) => {
  try {
    return TranslationSchema.parse(dict);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`Validation failed for language "${lang}":`);
      for (const issue of error.issues) {
        console.error(`  - [${issue.path.join('.')}] ${issue.message}`);
      }
      throw new Error(`Invalid translation dictionary for ${lang}`);
    }
    throw error;
  }
};

const dictionaries = {
  en: validateDictionary('en', en),
  ru: validateDictionary('ru', ru),
  es: validateDictionary('es', es),
  de: validateDictionary('de', de),
  fr: validateDictionary('fr', fr),
  it: validateDictionary('it', it),
  pt: validateDictionary('pt', pt),
  zh: validateDictionary('zh', zh),
  ja: validateDictionary('ja', ja),
  tr: validateDictionary('tr', tr),
};

export const translations: Record<SupportedLocale, TranslationDictionary> = dictionaries;

export default translations;
