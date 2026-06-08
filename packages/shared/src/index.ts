// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export enum Language {
  Russian = 'ru',
  English = 'en',
  Spanish = 'es',
  German = 'de',
  French = 'fr',
}

export enum CefrLevel {
  A0 = 'A0',
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2',
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain Entities
// ─────────────────────────────────────────────────────────────────────────────

export interface UserSettings {
  baseLanguage: Language;       // родной язык пользователя
  learnedLanguage: Language;    // изучаемый язык
  level: CefrLevel;
}

export interface User {
  id: string;
  telegramId?: string;
  settings: UserSettings;
  createdAt: Date;
}

/** Статус обработки слова */
export enum WordStatus {
  Pending = 'pending',       // только добавлено, ждёт обработки
  Processing = 'processing', // загружаем перевод/определения
  Ready = 'ready',           // всё загружено
  Error = 'error',           // ошибка при загрузке
}

export interface Definition {
  id: string;
  text: string;              // определение на изучаемом языке
  translation: string;       // перевод определения на родной язык
  translationStatus: WordStatus;
}

export interface Word {
  id: string;
  userId: string;
  text: string;              // слово на изучаемом языке
  translation: string;       // перевод слова на родной язык
  translationStatus: WordStatus;
  definitions: Definition[];
  status: WordStatus;        // агрегированный статус (ready когда всё загружено)
  createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Message Bus — Event Contracts
// ─────────────────────────────────────────────────────────────────────────────

/** Запрос на перевод слова */
export interface WordTranslateRequestedEvent {
  wordId: string;
  userId: string;
  word: string;
  sourceLanguage: Language;
  targetLanguage: Language;
}

/** Перевод слова готов */
export interface WordTranslateCompletedEvent {
  wordId: string;
  userId: string;
  translation: string;
}

/** Запрос на получение определений */
export interface WordDefinitionsRequestedEvent {
  wordId: string;
  userId: string;
  word: string;
  language: Language;
}

/** Определения готовы */
export interface WordDefinitionsCompletedEvent {
  wordId: string;
  userId: string;
  definitions: Array<{ text: string }>;
}

/** Запрос на перевод определения */
export interface DefinitionTranslateRequestedEvent {
  wordId: string;
  definitionId: string;
  userId: string;
  text: string;
  sourceLanguage: Language;
  targetLanguage: Language;
}

/** Перевод определения готов */
export interface DefinitionTranslateCompletedEvent {
  wordId: string;
  definitionId: string;
  userId: string;
  translation: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Topic Registry — единый источник правды для имён событий
// ─────────────────────────────────────────────────────────────────────────────

export const EventTopics = {
  WORD_TRANSLATE_REQUESTED: 'word.translate.requested',
  WORD_TRANSLATE_COMPLETED: 'word.translate.completed',
  WORD_DEFINITIONS_REQUESTED: 'word.definitions.requested',
  WORD_DEFINITIONS_COMPLETED: 'word.definitions.completed',
  DEFINITION_TRANSLATE_REQUESTED: 'definition.translate.requested',
  DEFINITION_TRANSLATE_COMPLETED: 'definition.translate.completed',
} as const;

export type EventTopic = (typeof EventTopics)[keyof typeof EventTopics];

// ─────────────────────────────────────────────────────────────────────────────
// Broker Interface
// ─────────────────────────────────────────────────────────────────────────────

export type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

export interface IBroker {
  publish<T>(topic: string, payload: T): void;
  subscribe<T>(topic: string, handler: EventHandler<T>): void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Service HTTP API — типы запросов/ответов
// ─────────────────────────────────────────────────────────────────────────────

export interface AddWordRequest {
  text: string;
}

export interface UpdateSettingsRequest {
  baseLanguage?: Language;
  learnedLanguage?: Language;
  level?: CefrLevel;
}

export interface UpdateDefinitionRequest {
  text?: string;
  translation?: string;
}

// ───────────────────────────────────────────────────────────────────────────────
// Quiz Domain
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Карточка вопроса в квизе.
 * Пользователь видит определение и должен угадать слово.
 */
export interface QuizCard {
  /** ID сессии (= userId для простоты) */
  sessionId: string;

  /** ID загаданного слова (не отправляется клиенту до правильного ответа) */
  wordId: string;
  /** ID показываемого определения */
  definitionId: string;

  /** Текст определения (на изучаемом языке) */
  definitionText: string;
  /** Перевод определения (показывается пользователю только после действия "Translate definition") */
  definitionTranslation: string | null;

  /** Случайные 5 вариантов ответа + правильный в случайной позиции.
   *  null — пока не нажата кнопка "Show variants" */
  variants: string[] | null;

  /** Номер отвеченных слов за эту сессию (для показа прогресса) */
  streak: number;
}

/** Результат проверки ответа */
export type QuizAnswerVerdict = 'correct' | 'close' | 'wrong';

export interface QuizAnswerResult {
  verdict: QuizAnswerVerdict;
  /** Правильный ответ (всегда возвращается, чтобы показать пользователю правильный ответ после проверки) */
  correctWord: string;
  /** Следующая карточка (null если wrong/close — пользователь остаётся на той же карточке) */
  nextCard: QuizCard | null;
  /** Обновлённый streak */
  streak: number;
}

/** Действия интерфейса quiz-карточки */
export enum QuizAction {
  /** Показать варианты ответа */
  ShowVariants = 'show_variants',
  /** Показать перевод определения */
  TranslateDefinition = 'translate_definition',
  /** Следующая карточка (скип) */
  AnotherCard = 'another_card',
  /** Другое определение для того же слова */
  AnotherDefinition = 'another_definition',
}

/** HTTP запрос: ответ пользователя */
export interface QuizAnswerRequest {
  suggestion: string;
}

/** HTTP запрос: действие на карточке */
export interface QuizActionRequest {
  action: QuizAction;
}


// ─────────────────────────────────────────────────────────────────────────────
// FSM — состояния диалога (используются и в боте, и в core-service)
// ─────────────────────────────────────────────────────────────────────────────

export enum DialogState {
  WELCOME = 'WELCOME',
  SETTINGS = 'SETTINGS',
  SET_BASE_LANGUAGE = 'SET_BASE_LANGUAGE',
  SET_LEARNED_LANGUAGE = 'SET_LEARNED_LANGUAGE',
  SET_LEVEL = 'SET_LEVEL',
  DICTIONARY = 'DICTIONARY',
  ADD_WORDS = 'ADD_WORDS',
  WORDS_RECEIVED = 'WORDS_RECEIVED',
  EDIT_DICTIONARY = 'EDIT_DICTIONARY',
  EDIT_WORD = 'EDIT_WORD',
  CONFIRM_DELETE_WORD = 'CONFIRM_DELETE_WORD',
  EDIT_DEFINITION = 'EDIT_DEFINITION',
  EDIT_TRANSLATION = 'EDIT_TRANSLATION',
  QUIZ = 'QUIZ',
}
