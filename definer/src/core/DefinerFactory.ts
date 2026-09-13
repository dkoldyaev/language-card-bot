import { IDefiner, DefinerAppType } from './IDefiner';
import { MockDefiner } from '../adapters/MockDefiner';
import { LLMAdapter } from '../adapters/LLMAdapter';
import { FreeDictionaryDefiner } from '../adapters/FreeDictionaryDefiner';

export class DefinerFactory {
  static getDefiner(definerApp: DefinerAppType): IDefiner {
    switch (definerApp) {
      case 'mistral':
        return new LLMAdapter({ provider: 'mistral', model: process.env.DEFINER_LLM_MODEL || 'open-mistral-nemo' });
      case 'gemini':
        return new LLMAdapter({ provider: 'gemini', model: process.env.DEFINER_LLM_MODEL || 'gemini-1.5-flash' });
      case 'llm':
        return new LLMAdapter({ provider: (process.env.DEFINER_LLM_PROVIDER as any) || 'mistral', model: process.env.DEFINER_LLM_MODEL || 'open-mistral-nemo' });
      case 'freedictionary':
        return new FreeDictionaryDefiner();
      case 'mock':
        return new MockDefiner();
      default:
        // Default to mock if unknown at runtime
        return new MockDefiner();
    }
  }
}
