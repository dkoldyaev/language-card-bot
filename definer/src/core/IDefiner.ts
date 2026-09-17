export type DefinerAppType = 'mistral' | 'gemini' | 'mock' | 'freedictionary' | 'llm';

export interface DefinitionItem {
  text: string;
  tags: string[];
  partOfSpeech: string | null;
  levels: string[];
}

export interface IDefiner {
  define(text: string, language: string): Promise<DefinitionItem[]>;
}

