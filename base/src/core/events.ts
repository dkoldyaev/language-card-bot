import { EventEmitter } from 'events';

export const appEvents = new EventEmitter();

export const Events = {
  WORD_ADDED: 'word_added',
  DEFINITION_ADDED: 'definition_added',
  TRANSLATION_ADDED: 'translation_added'
} as const;

export interface WordAddedPayload {
  userId: number;
  username: string;
  wordId: number;
  wordText: string;
  dictionaryId?: number;
}

export interface DefinitionAddedPayload {
  definitionId: number;
  definitionText: string;
  userId: number;
  username: string;
  wordId: number;
  wordText: string;
  totalDefinitions: number;
  dictionaryId?: number;
  presets?: { id: number; title: string }[];
  sourceLanguage?: string;
  targetLanguage?: string;
}

export interface TranslationAddedPayload {
  username: string;
  wordId: number;
  definitionId: number;
  translation: string;
}
