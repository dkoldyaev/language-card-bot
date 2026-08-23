export type DefinerAppType = 'mistral' | 'gemini' | 'mock';

export interface IDefiner {
  define(text: string, language: string): Promise<string[]>;
}
