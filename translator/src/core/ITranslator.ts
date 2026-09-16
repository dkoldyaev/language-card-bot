export type TranslatorAppType = 'googletranslate' | 'mock' | 'laratranslate' | 'llm' | 'mistral' | 'gemini';

export interface ITranslator {
  translate(texts: string[], sourceLang: string, targetLang: string): Promise<string[]>;
}
