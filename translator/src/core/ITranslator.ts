export type TranslatorAppType = 'googletranslate' | 'mock';

export interface ITranslator {
  translate(text: string, sourceLang: string, targetLang: string): Promise<string>;
}
