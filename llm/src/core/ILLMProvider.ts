export type LLMProviderType = 'mistral' | 'gemini' | 'mock';

export interface GenerateOptions {
  prompt: string;
  model: string;
  jsonFormat: string | Record<string, unknown>;
}

export interface ILLMProvider {
  generate(options: GenerateOptions): Promise<unknown>;
}
