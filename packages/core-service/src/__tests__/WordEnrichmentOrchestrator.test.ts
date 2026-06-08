import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WordEnrichmentOrchestrator } from '../services/WordEnrichmentOrchestrator';
import { UserRepository } from '../repositories/UserRepository';
import { WordRepository } from '../repositories/WordRepository';
import {
  IBroker,
  EventTopics,
  EventHandler,
  WordStatus,
  WordTranslateCompletedEvent,
  WordDefinitionsCompletedEvent,
  DefinitionTranslateCompletedEvent,
} from '@ecb/shared';

/**
 * Тесты WordEnrichmentOrchestrator
 *
 * Используем синхронный MockBroker (без setImmediate),
 * чтобы тестировать события предсказуемо и без таймеров.
 *
 * Проверяем:
 * - enrich() публикует нужные события
 * - enrich() игнорирует несуществующего пользователя
 * - обработка WORD_TRANSLATE_COMPLETED обновляет репозиторий
 * - обработка WORD_DEFINITIONS_COMPLETED создаёт определения и публикует DEFINITION_TRANSLATE_REQUESTED
 * - обработка DEFINITION_TRANSLATE_COMPLETED обновляет перевод определения
 * - onWordStatusUpdate колбек вызывается при каждом обновлении
 */

/** Синхронный брокер для тестов — доставляет события мгновенно */
class SyncMockBroker implements IBroker {
  private handlers = new Map<string, EventHandler<unknown>[]>();
  publishedEvents: Array<{ topic: string; payload: unknown }> = [];

  publish<T>(topic: string, payload: T): void {
    this.publishedEvents.push({ topic, payload });
    const handlers = this.handlers.get(topic) ?? [];
    for (const h of handlers) {
      h(payload as unknown);
    }
  }

  subscribe<T>(topic: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(topic)) this.handlers.set(topic, []);
    this.handlers.get(topic)!.push(handler as EventHandler<unknown>);
  }

  /** Все события с данным топиком */
  eventsFor(topic: string) {
    return this.publishedEvents.filter((e) => e.topic === topic);
  }
}

describe('WordEnrichmentOrchestrator', () => {
  let broker: SyncMockBroker;
  let users: UserRepository;
  let words: WordRepository;
  let orchestrator: WordEnrichmentOrchestrator;

  beforeEach(() => {
    broker = new SyncMockBroker();
    users = new UserRepository();
    words = new WordRepository();
    orchestrator = new WordEnrichmentOrchestrator(broker, users, words);
  });

  // ── enrich() ─────────────────────────────────────────────────────────────

  describe('enrich()', () => {
    it('публикует WORD_TRANSLATE_REQUESTED и WORD_DEFINITIONS_REQUESTED', () => {
      const user = users.create({ telegramId: 'tg-1' });
      const word = words.create(user.id, 'run');

      orchestrator.enrich(word);

      expect(broker.eventsFor(EventTopics.WORD_TRANSLATE_REQUESTED)).toHaveLength(1);
      expect(broker.eventsFor(EventTopics.WORD_DEFINITIONS_REQUESTED)).toHaveLength(1);
    });

    it('событие перевода содержит корректные данные', () => {
      const user = users.create({ telegramId: 'tg-1' });
      const word = words.create(user.id, 'fly');

      orchestrator.enrich(word);

      const event = broker.eventsFor(EventTopics.WORD_TRANSLATE_REQUESTED)[0].payload as any;
      expect(event.wordId).toBe(word.id);
      expect(event.userId).toBe(user.id);
      expect(event.word).toBe('fly');
      expect(event.sourceLanguage).toBe(user.settings.learnedLanguage);
      expect(event.targetLanguage).toBe(user.settings.baseLanguage);
    });

    it('не публикует события если пользователь не найден', () => {
      const word = words.create('nonexistent-user', 'test');
      orchestrator.enrich(word);

      expect(broker.publishedEvents).toHaveLength(0);
    });
  });

  // ── WORD_TRANSLATE_COMPLETED ──────────────────────────────────────────────

  describe('при получении WORD_TRANSLATE_COMPLETED', () => {
    it('обновляет перевод слова в репозитории', () => {
      const user = users.create();
      const word = words.create(user.id, 'jump');

      const event: WordTranslateCompletedEvent = {
        wordId: word.id,
        userId: user.id,
        translation: 'прыгать',
      };
      broker.publish(EventTopics.WORD_TRANSLATE_COMPLETED, event);

      const updated = words.findById(word.id)!;
      expect(updated.translation).toBe('прыгать');
      expect(updated.translationStatus).toBe(WordStatus.Ready);
    });

    it('вызывает зарегистрированный коллбек статуса', () => {
      const user = users.create();
      const word = words.create(user.id, 'jump');
      const cb = vi.fn();
      orchestrator.onWordStatusUpdate(cb);

      broker.publish<WordTranslateCompletedEvent>(EventTopics.WORD_TRANSLATE_COMPLETED, {
        wordId: word.id,
        userId: user.id,
        translation: 'прыгать',
      });

      expect(cb).toHaveBeenCalledOnce();
      expect(cb).toHaveBeenCalledWith(expect.objectContaining({ id: word.id }));
    });
  });

  // ── WORD_DEFINITIONS_COMPLETED ────────────────────────────────────────────

  describe('при получении WORD_DEFINITIONS_COMPLETED', () => {
    it('добавляет определения к слову', () => {
      const user = users.create();
      const word = words.create(user.id, 'smart');

      broker.publish<WordDefinitionsCompletedEvent>(EventTopics.WORD_DEFINITIONS_COMPLETED, {
        wordId: word.id,
        userId: user.id,
        definitions: [{ text: 'having quick intelligence' }, { text: 'elegant in appearance' }],
      });

      expect(words.findById(word.id)!.definitions).toHaveLength(2);
    });

    it('публикует DEFINITION_TRANSLATE_REQUESTED для каждого определения', () => {
      const user = users.create();
      const word = words.create(user.id, 'smart');

      broker.publish<WordDefinitionsCompletedEvent>(EventTopics.WORD_DEFINITIONS_COMPLETED, {
        wordId: word.id,
        userId: user.id,
        definitions: [{ text: 'def 1' }, { text: 'def 2' }],
      });

      expect(broker.eventsFor(EventTopics.DEFINITION_TRANSLATE_REQUESTED)).toHaveLength(2);
    });

    it('событие перевода определения содержит корректные данные', () => {
      const user = users.create();
      const word = words.create(user.id, 'smart');

      broker.publish<WordDefinitionsCompletedEvent>(EventTopics.WORD_DEFINITIONS_COMPLETED, {
        wordId: word.id,
        userId: user.id,
        definitions: [{ text: 'clever' }],
      });

      const defEvent = broker.eventsFor(EventTopics.DEFINITION_TRANSLATE_REQUESTED)[0]
        .payload as any;
      expect(defEvent.wordId).toBe(word.id);
      expect(defEvent.text).toBe('clever');
      expect(defEvent.sourceLanguage).toBe(user.settings.learnedLanguage);
      expect(defEvent.targetLanguage).toBe(user.settings.baseLanguage);
    });

    it('не обрабатывает событие если слово не найдено', () => {
      const user = users.create();
      const cb = vi.fn();
      orchestrator.onWordStatusUpdate(cb);

      broker.publish<WordDefinitionsCompletedEvent>(EventTopics.WORD_DEFINITIONS_COMPLETED, {
        wordId: 'nonexistent-word',
        userId: user.id,
        definitions: [{ text: 'def' }],
      });

      expect(cb).not.toHaveBeenCalled();
    });

    it('вызывает коллбек статуса после добавления определений', () => {
      const user = users.create();
      const word = words.create(user.id, 'smart');
      const cb = vi.fn();
      orchestrator.onWordStatusUpdate(cb);

      broker.publish<WordDefinitionsCompletedEvent>(EventTopics.WORD_DEFINITIONS_COMPLETED, {
        wordId: word.id,
        userId: user.id,
        definitions: [{ text: 'def 1' }],
      });

      expect(cb).toHaveBeenCalledOnce();
    });
  });

  // ── DEFINITION_TRANSLATE_COMPLETED ───────────────────────────────────────

  describe('при получении DEFINITION_TRANSLATE_COMPLETED', () => {
    it('обновляет перевод определения', () => {
      const user = users.create();
      const word = words.create(user.id, 'kind');
      const [def] = words.addDefinitions(word.id, [{ text: 'warm and caring' }]);

      broker.publish<DefinitionTranslateCompletedEvent>(
        EventTopics.DEFINITION_TRANSLATE_COMPLETED,
        { wordId: word.id, definitionId: def.id, userId: user.id, translation: 'тёплый и заботливый' }
      );

      const updatedDef = words.findById(word.id)!.definitions.find((d) => d.id === def.id)!;
      expect(updatedDef.translation).toBe('тёплый и заботливый');
      expect(updatedDef.translationStatus).toBe(WordStatus.Ready);
    });

    it('вызывает коллбек статуса после обновления перевода определения', () => {
      const user = users.create();
      const word = words.create(user.id, 'kind');
      const [def] = words.addDefinitions(word.id, [{ text: 'warm and caring' }]);
      const cb = vi.fn();
      orchestrator.onWordStatusUpdate(cb);

      broker.publish<DefinitionTranslateCompletedEvent>(
        EventTopics.DEFINITION_TRANSLATE_COMPLETED,
        { wordId: word.id, definitionId: def.id, userId: user.id, translation: 'добрый' }
      );

      expect(cb).toHaveBeenCalledOnce();
    });
  });

  // ── onWordStatusUpdate ────────────────────────────────────────────────────

  describe('onWordStatusUpdate()', () => {
    it('можно зарегистрировать несколько коллбеков', () => {
      const user = users.create();
      const word = words.create(user.id, 'test');
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      orchestrator.onWordStatusUpdate(cb1);
      orchestrator.onWordStatusUpdate(cb2);

      broker.publish<WordTranslateCompletedEvent>(EventTopics.WORD_TRANSLATE_COMPLETED, {
        wordId: word.id,
        userId: user.id,
        translation: 'тест',
      });

      expect(cb1).toHaveBeenCalledOnce();
      expect(cb2).toHaveBeenCalledOnce();
    });

    it('ошибка в одном коллбеке не ломает другие', () => {
      const user = users.create();
      const word = words.create(user.id, 'test');
      const cbBad = vi.fn().mockImplementation(() => { throw new Error('boom'); });
      const cbGood = vi.fn();
      orchestrator.onWordStatusUpdate(cbBad);
      orchestrator.onWordStatusUpdate(cbGood);

      // не должно бросать
      expect(() =>
        broker.publish<WordTranslateCompletedEvent>(EventTopics.WORD_TRANSLATE_COMPLETED, {
          wordId: word.id,
          userId: user.id,
          translation: 'тест',
        })
      ).not.toThrow();

      expect(cbGood).toHaveBeenCalledOnce();
    });
  });
});
