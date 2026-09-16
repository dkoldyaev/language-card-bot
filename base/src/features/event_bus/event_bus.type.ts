
export type MercureVersion = 'v1';

export interface BaseMercureEvent {
  version: MercureVersion;
  type: string;
}

export interface StateSyncMercureEvent extends BaseMercureEvent {
  type: 'state_sync';
  activeDictionaryId?: number | null;
  activeDictionary?: { id: number; name: string; targetLanguage: string; baseLanguage: string } | null;
  currentWordId?: number | null;
  currentWord?: { id: number; text: string } | null;
  showVariants?: boolean;
  showDefinitionTranslation?: boolean;
  currentDefinitionId?: number | null;
  currentDefinition?: { id: number; text: string; translation: string | null } | null;
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
  };
}

export interface DictionariesSyncMercureEvent extends BaseMercureEvent {
  type: 'dictionaries_sync';
  dictionaries: {
    id: number;
    name: string;
    targetLanguage: string;
    baseLanguage: string;
    wordCount?: number;
    isActive?: boolean;
  }[];
  activeDictionaryId?: number | null;
}

export interface DictionaryAddDuplicateEvent extends BaseMercureEvent {
  type: 'dictionary_add_duplicate';
  words: string[];
}

export interface DictionaryAddProcessingItem {
  wordId: number;
  word: string;
  presets?: { id: number; title: string }[];
}

export interface DictionaryAddProcessingEvent extends BaseMercureEvent {
  type: 'dictionary_add_processing';
  words: DictionaryAddProcessingItem[];
}

export interface DictionaryAddDefinitionItem {
  id: number;
  text: string;
  presets?: { id: number; title: string }[];
}

export interface DictionaryAddDefinitionsWordItem {
  wordId: number;
  word: string;
  definitions: DictionaryAddDefinitionItem[];
}

export interface DictionaryAddDefinitionsReceivedEvent extends BaseMercureEvent {
  type: 'dictionary_add_definitions_received';
  words: DictionaryAddDefinitionsWordItem[];
}

export interface DefinitionTranslateLoadedEvent extends BaseMercureEvent {
  type: 'definition_translate_loaded';
  wordId: number;
  definitionId: number;
  translation: string;
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
  variants: string[];
}

export interface QuizDefinitionTranslationMercureEvent extends BaseMercureEvent {
  type: 'quiz_definition_translation';
  translation: string;
}

export interface QuizAnswerEvaluationMercureEvent extends BaseMercureEvent {
  type: 'quiz_answer_evaluation';
  result: 'SUCCESS' | 'CLOSE_MATCH' | 'INCORRECT';
  suggestion: string;
}

export interface QuizCleanupMercureEvent extends BaseMercureEvent {
  type: 'quiz_cleanup';
}

export type MercureEvent = 
  | StateSyncMercureEvent 
  | EchoMercureEvent 
  | SettingsSyncMercureEvent
  | DictionariesSyncMercureEvent
  | DictionaryAddDuplicateEvent
  | DictionaryAddProcessingEvent
  | DictionaryAddDefinitionsReceivedEvent
  | DefinitionTranslateLoadedEvent
  | QuizCardMercureEvent
  | QuizVariantsMercureEvent
  | QuizDefinitionTranslationMercureEvent
  | QuizAnswerEvaluationMercureEvent
  | QuizCleanupMercureEvent;
