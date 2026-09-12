export type LLMProviderType = 'mistral' | 'gemini' | 'mock';

export interface GenerateOptions {
  prompt: string;
  model: string;
  jsonFormat: string | Record<string, any>;
}

export interface ILLMProvider {
  generate(options: GenerateOptions): Promise<any>;
}
