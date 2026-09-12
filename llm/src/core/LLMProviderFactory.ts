import { ILLMProvider, LLMProviderType } from './ILLMProvider';
import { MistralProvider } from '../providers/MistralProvider';
import { GeminiProvider } from '../providers/GeminiProvider';
import { MockProvider } from '../providers/MockProvider';

export class LLMProviderFactory {
  static getProvider(provider: LLMProviderType): ILLMProvider {
    switch (provider) {
      case 'mistral':
        return new MistralProvider();
      case 'gemini':
        return new GeminiProvider();
      case 'mock':
        return new MockProvider();
      default:
        return new MockProvider();
    }
  }
}
