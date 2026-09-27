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

export const translations: Record<SupportedLocale, TranslationDictionary> = {
  en,
  ru,
  es,
  de,
  fr,
  it,
  pt,
  zh,
  ja,
  tr,
};

export default translations;
