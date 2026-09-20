import { EventEmitter } from 'node:events';
import type { LanguageCode } from '../types/language';

export const appEvents = new EventEmitter();

export const Events = {
  WORDS_LIST_ADDED: 'words_list_added',
  DEFINITION_ADDED: 'definition_added',
  TRANSLATION_ADDED: 'translation_added'
} as const;

export interface AddedWordItem {
  wordId: number;
  wordText: string;
}

export interface WordsListAddedPayload {
  userId: number;
  username: string;
  dictionaryId?: number;
  words: AddedWordItem[];
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
  sourceLanguage?: LanguageCode;
  targetLanguage?: LanguageCode;
}

export interface TranslationAddedDefinitionItem {
  id: number;
  translation: string;
}

export interface TranslationAddedPayload {
  username: string;
  wordId: number;
  definitions: TranslationAddedDefinitionItem[];
}
