import en from './en';
import ru from './ru';
import es from './es';
import de from './de';
import fr from './fr';
import it from './it';
import pt from './pt';
import zh from './zh';
import ja from './ja';
import tr from './tr';
import { type SupportedLocale, type TranslationDictionary } from '../types';

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

