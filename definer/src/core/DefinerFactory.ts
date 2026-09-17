import { IDefiner, DefinerAppType } from './IDefiner';
import { MockDefiner } from '../adapters/MockDefiner';
import { LLMAdapter } from '../adapters/LLMAdapter';
import { FreeDictionaryDefiner } from '../adapters/FreeDictionaryDefiner';
import { env } from './env';

export class DefinerFactory {
  static getDefiner(definerApp: DefinerAppType): IDefiner {
    switch (definerApp) {
      case 'mistral':
        return new LLMAdapter({ provider: 'mistral', model: env.LLM_MODEL });
      case 'gemini':
        return new LLMAdapter({ provider: 'gemini', model: env.LLM_MODEL });
      case 'llm':
        return new LLMAdapter({ provider: env.LLM_PROVIDER, model: env.LLM_MODEL });
      case 'freedictionary':
        return new FreeDictionaryDefiner();
      case 'mock':
        return new MockDefiner();
      default:
        return new MockDefiner();
    }
  }
}
