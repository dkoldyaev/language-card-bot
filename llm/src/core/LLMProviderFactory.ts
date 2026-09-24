import { GeminiProvider } from '../providers/GeminiProvider';
import { MistralProvider } from '../providers/MistralProvider';
import { MockProvider } from '../providers/MockProvider';
import type { ILLMProvider, LLMProviderType } from './ILLMProvider';

export const LLMProviderFactory = {
  getProvider(provider: LLMProviderType): ILLMProvider {
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
  },
};
