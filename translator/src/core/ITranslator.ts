export type TranslatorAppType = 'googletranslate' | 'mock' | 'laratranslate';

export interface ITranslator {
  translate(text: string, sourceLang: string, targetLang: string): Promise<string>;
}
