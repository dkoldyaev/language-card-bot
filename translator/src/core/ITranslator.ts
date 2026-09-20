import type { LanguageCode } from '../types/language';

export type TranslatorAppType = 'googletranslate' | 'mock' | 'laratranslate' | 'llm' | 'mistral' | 'gemini';

export interface ITranslator {
  translate(texts: string[], sourceLang: LanguageCode, targetLang: LanguageCode): Promise<string[]>;
}
