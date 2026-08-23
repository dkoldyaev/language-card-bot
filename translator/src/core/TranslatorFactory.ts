import { ITranslator, TranslatorAppType } from './ITranslator';
import { MockTranslator } from '../adapters/MockTranslator';
import { GoogleTranslator } from '../adapters/GoogleTranslator';

export class TranslatorFactory {
  static getTranslator(translatorApp: TranslatorAppType): ITranslator {
    switch (translatorApp) {
      case 'googletranslate':
        return new GoogleTranslator();
      case 'mock':
        return new MockTranslator();
      default:
        // Default to mock if unknown at runtime
        return new MockTranslator();
    }
  }
}
