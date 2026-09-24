import { GoogleTranslator } from '../adapters/GoogleTranslator';
import { LaratranslateTranslator } from '../adapters/LaratranslateTranslator';
import { LLMAdapter } from '../adapters/LLMAdapter';
import { MockTranslator } from '../adapters/MockTranslator';
import { env } from './env';
import type { ITranslator, TranslatorAppType } from './ITranslator';

export const TranslatorFactory = {
  getTranslator(translatorApp: TranslatorAppType): ITranslator {
    switch (translatorApp) {
      case 'googletranslate':
        return new GoogleTranslator();
      case 'mock':
        return new MockTranslator();
      case 'laratranslate':
        return new LaratranslateTranslator();
      case 'mistral':
        return new LLMAdapter({ provider: 'mistral', model: env.LLM_MODEL });
      case 'gemini':
        return new LLMAdapter({ provider: 'gemini', model: env.LLM_MODEL });
      case 'llm':
        return new LLMAdapter({
          provider: env.LLM_PROVIDER,
          model: env.LLM_MODEL,
        });
      default:
        // Default to mock if unknown at runtime
        return new MockTranslator();
    }
  },
};
