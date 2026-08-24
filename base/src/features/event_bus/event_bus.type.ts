import { UserMode } from '@prisma/client';

export type MercureVersion = 'v1';

export interface BaseMercureEvent {
  version: MercureVersion;
  type: string;
}

export interface StateSyncMercureEvent extends BaseMercureEvent {
  type: 'state_sync';
  mode: UserMode;
  currentWordId?: number | null;
  showVariants?: boolean;
  showDefinitionTranslation?: boolean;
  currentDefinitionId?: number | null;
}

export interface EchoMercureEvent extends BaseMercureEvent {
  type: 'echo';
  message: string;
  data: unknown;
  user: {
    username: string;
  };
}

export interface SettingsSyncMercureEvent extends BaseMercureEvent {
  type: 'settings_sync';
  settings: {
    baseLanguage: string;
    targetLanguage: string;
    desiredLevel: string;
  };
}

export interface DictionaryAddDuplicateEvent extends BaseMercureEvent {
  type: 'dictionary_add_duplicate';
  word: string;
  definitionsCount: number;
}

export interface DictionaryAddProcessingEvent extends BaseMercureEvent {
  type: 'dictionary_add_processing';
  word: string;
}

export interface DictionaryAddDefinitionsReceivedEvent extends BaseMercureEvent {
  type: 'dictionary_add_definitions_received';
  word: string;
  definitionsCount: number;
}

export interface DictionaryAddDefinitionProcessedEvent extends BaseMercureEvent {
  type: 'dictionary_add_definition_processed';
  word: string;
  processedCount: number;
  totalDefinitions: number;
}

export interface QuizCardMercureEvent extends BaseMercureEvent {
  type: 'quiz_card';
  wordId: number;
  definition: {
    id: number;
    text: string;
    translation: string | null;
  };
}

export interface QuizVariantsMercureEvent extends BaseMercureEvent {
  type: 'quiz_variants';
  variants: { id: number; text: string }[];
}

export interface QuizDefinitionTranslationMercureEvent extends BaseMercureEvent {
  type: 'quiz_definition_translation';
  translation: string;
}

export interface QuizAnswerEvaluationMercureEvent extends BaseMercureEvent {
  type: 'quiz_answer_evaluation';
  result: 'SUCCESS' | 'CLOSE_MATCH' | 'INCORRECT';
  emoji: string;
  suggestion: string;
}

export type MercureEvent = 
  | StateSyncMercureEvent 
  | EchoMercureEvent 
  | SettingsSyncMercureEvent
  | DictionaryAddDuplicateEvent
  | DictionaryAddProcessingEvent
  | DictionaryAddDefinitionsReceivedEvent
  | DictionaryAddDefinitionProcessedEvent
  | QuizCardMercureEvent
  | QuizVariantsMercureEvent
  | QuizDefinitionTranslationMercureEvent
  | QuizAnswerEvaluationMercureEvent;
