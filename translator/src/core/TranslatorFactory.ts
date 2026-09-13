import { ITranslator, TranslatorAppType } from './ITranslator';
import { MockTranslator } from '../adapters/MockTranslator';
import { GoogleTranslator } from '../adapters/GoogleTranslator';
import { LaratranslateTranslator } from '../adapters/LaratranslateTranslator';
import { LLMAdapter } from '../adapters/LLMAdapter';
import { env } from './env';

export class TranslatorFactory {
  static getTranslator(translatorApp: TranslatorAppType): ITranslator {
    switch (translatorApp) {
      case 'googletranslate':
        return new GoogleTranslator();
      case 'mock':
        return new MockTranslator();
      case 'laratranslate':
        return new LaratranslateTranslator();
      case 'mistral':
        return new LLMAdapter({ provider: 'mistral', model: env.TRANSLATOR_LLM_MODEL });
      case 'gemini':
        return new LLMAdapter({ provider: 'gemini', model: env.TRANSLATOR_LLM_MODEL });
      case 'llm':
        return new LLMAdapter({
          provider: env.TRANSLATOR_LLM_PROVIDER,
          model: env.TRANSLATOR_LLM_MODEL,
        });
      default:
        // Default to mock if unknown at runtime
        return new MockTranslator();
    }
  }
}
