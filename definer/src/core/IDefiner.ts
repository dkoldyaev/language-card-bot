export type DefinerAppType = 'mistral' | 'gemini' | 'mock' | 'freedictionary';

export interface IDefiner {
  define(text: string, language: string): Promise<string[]>;
}
