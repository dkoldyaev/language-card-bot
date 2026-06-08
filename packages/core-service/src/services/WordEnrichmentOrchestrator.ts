import {
  IBroker,
  EventTopics,
  WordTranslateRequestedEvent,
  WordTranslateCompletedEvent,
  WordDefinitionsRequestedEvent,
  WordDefinitionsCompletedEvent,
  DefinitionTranslateRequestedEvent,
  DefinitionTranslateCompletedEvent,
  WordStatus,
} from '@ecb/shared';
import { UserRepository } from '../repositories/UserRepository';
import { WordRepository } from '../repositories/WordRepository';
import { Word } from '@ecb/shared';

export type WordStatusUpdateCallback = (word: Word) => void;

/**
 * WordEnrichmentOrchestrator
 *
 * Управляет асинхронным обогащением слова:
 * 1. Публикует событие перевода слова
 * 2. Публикует событие загрузки определений
 * 3. Когда определения готовы — публикует переводы каждого определения
 * 4. Обновляет репозиторий при получении результатов
 *
 * Уведомляет подписчиков (например, telegram-bot) через onWordStatusUpdate.
 *
 * TODO: Добавить retry-логику при ошибках.
 * TODO: При реальном брокере учесть at-least-once delivery.
 */
export class WordEnrichmentOrchestrator {
  private readonly statusCallbacks: WordStatusUpdateCallback[] = [];

  constructor(
    private readonly broker: IBroker,
    private readonly users: UserRepository,
    private readonly words: WordRepository
  ) {
    this._subscribeToEvents();
  }

  /** Начать обогащение слова после добавления в репозиторий */
  enrich(word: Word): void {
    const user = this.users.findById(word.userId);
    if (!user) {
      console.error(`[Orchestrator] User ${word.userId} not found for word ${word.id}`);
      return;
    }

    console.log(`[Orchestrator] Starting enrichment for word "${word.text}" (${word.id})`);

    // 1. Запрос перевода слова
    this.broker.publish<WordTranslateRequestedEvent>(EventTopics.WORD_TRANSLATE_REQUESTED, {
      wordId: word.id,
      userId: user.id,
      word: word.text,
      sourceLanguage: user.settings.learnedLanguage,
      targetLanguage: user.settings.baseLanguage,
    });

    // 2. Параллельно запрашиваем определения
    this.broker.publish<WordDefinitionsRequestedEvent>(EventTopics.WORD_DEFINITIONS_REQUESTED, {
      wordId: word.id,
      userId: user.id,
      word: word.text,
      language: user.settings.learnedLanguage,
    });
  }

  /** Подписаться на обновления статуса слова (используется frontend-клиентами) */
  onWordStatusUpdate(cb: WordStatusUpdateCallback): void {
    this.statusCallbacks.push(cb);
  }

  private _notifyStatusUpdate(word: Word): void {
    for (const cb of this.statusCallbacks) {
      try {
        cb(word);
      } catch (err) {
        console.error('[Orchestrator] Error in status callback:', err);
      }
    }
  }

  private _subscribeToEvents(): void {
    // Перевод слова получен
    this.broker.subscribe<WordTranslateCompletedEvent>(
      EventTopics.WORD_TRANSLATE_COMPLETED,
      (event) => {
        console.log(`[Orchestrator] ← word.translate.completed for ${event.wordId}`);
        try {
          const word = this.words.updateTranslation(event.wordId, event.translation);
          this._notifyStatusUpdate(word);
        } catch (err) {
          console.error('[Orchestrator] Failed to save translation:', err);
        }
      }
    );

    // Определения получены — запрашиваем перевод каждого
    this.broker.subscribe<WordDefinitionsCompletedEvent>(
      EventTopics.WORD_DEFINITIONS_COMPLETED,
      (event) => {
        console.log(
          `[Orchestrator] ← word.definitions.completed for ${event.wordId}: ${event.definitions.length} defs`
        );
        try {
          const word = this.words.findById(event.wordId);
          if (!word) return;
          const user = this.users.findById(event.userId);
          if (!user) return;

          const createdDefs = this.words.addDefinitions(event.wordId, event.definitions);

          // Запрашиваем перевод каждого определения
          for (const def of createdDefs) {
            this.broker.publish<DefinitionTranslateRequestedEvent>(
              EventTopics.DEFINITION_TRANSLATE_REQUESTED,
              {
                wordId: event.wordId,
                definitionId: def.id,
                userId: event.userId,
                text: def.text,
                sourceLanguage: user.settings.learnedLanguage,
                targetLanguage: user.settings.baseLanguage,
              }
            );
          }

          const updatedWord = this.words.findById(event.wordId)!;
          this._notifyStatusUpdate(updatedWord);
        } catch (err) {
          console.error('[Orchestrator] Failed to process definitions:', err);
        }
      }
    );

    // Перевод определения получен
    this.broker.subscribe<DefinitionTranslateCompletedEvent>(
      EventTopics.DEFINITION_TRANSLATE_COMPLETED,
      (event) => {
        console.log(`[Orchestrator] ← definition.translate.completed for def ${event.definitionId}`);
        try {
          const word = this.words.updateDefinitionTranslation(
            event.wordId,
            event.definitionId,
            event.translation
          );
          this._notifyStatusUpdate(word);
        } catch (err) {
          console.error('[Orchestrator] Failed to save definition translation:', err);
        }
      }
    );
  }
}
