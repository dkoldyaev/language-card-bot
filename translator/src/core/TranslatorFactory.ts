import { ITranslator, TranslatorAppType } from './ITranslator';
import { MockTranslator } from '../adapters/MockTranslator';
import { GoogleTranslator } from '../adapters/GoogleTranslator';
import { LaratranslateTranslator } from '../adapters/LaratranslateTranslator';
export class TranslatorFactory {
  static getTranslator(translatorApp: TranslatorAppType): ITranslator {
    switch (translatorApp) {
      case 'googletranslate':
        return new GoogleTranslator();
      case 'mock':
        return new MockTranslator();
      case 'laratranslate':
        return new LaratranslateTranslator();
      default:
        // Default to mock if unknown at runtime
        return new MockTranslator();
    }
  }
}
