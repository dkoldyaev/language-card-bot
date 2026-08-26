import { IDefiner, DefinerAppType } from './IDefiner';
import { MockDefiner } from '../adapters/MockDefiner';
import { MistralDefiner } from '../adapters/MistralDefiner';
import { GeminiDefiner } from '../adapters/GeminiDefiner';
import { FreeDictionaryDefiner } from '../adapters/FreeDictionaryDefiner';

export class DefinerFactory {
  static getDefiner(definerApp: DefinerAppType): IDefiner {
    switch (definerApp) {
      case 'mistral':
        return new MistralDefiner();
      case 'gemini':
        return new GeminiDefiner();
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
