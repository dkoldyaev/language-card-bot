import { IDefiner, DefinerAppType } from './IDefiner';
import { MockDefiner } from '../adapters/MockDefiner';
import { LLMAdapter } from '../adapters/LLMAdapter';
import { FreeDictionaryDefiner } from '../adapters/FreeDictionaryDefiner';

export class DefinerFactory {
  static getDefiner(definerApp: DefinerAppType): IDefiner {
    switch (definerApp) {
      case 'mistral':
        return new LLMAdapter({ provider: 'mistral', model: 'mistral-large-latest' });
      case 'gemini':
        return new LLMAdapter({ provider: 'gemini', model: 'gemini-1.5-flash' });
      case 'llm':
        return new LLMAdapter();
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
