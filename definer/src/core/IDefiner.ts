export type DefinerAppType = 'mistral' | 'gemini' | 'mock' | 'freedictionary' | 'llm';

export interface IDefiner {
  define(text: string, language: string): Promise<string[]>;
}
