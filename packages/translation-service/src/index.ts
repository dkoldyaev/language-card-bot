import { getBroker } from '@ecb/broker-mock';
import {
  EventTopics,
  WordTranslateRequestedEvent,
  WordTranslateCompletedEvent,
  DefinitionTranslateRequestedEvent,
  DefinitionTranslateCompletedEvent,
} from '@ecb/shared';

const MOCK_DELAY_MS = 200;

/**
 * MockTranslationService
 *
 * Слушает события запроса переводов и отвечает заглушками.
 *
 * Обрабатывает:
 *   word.translate.requested       → word.translate.completed
 *   definition.translate.requested → definition.translate.completed
 *
 * TODO: Заменить mockTranslate() на реальный вызов API (DeepL / Google Translate / LibreTranslate).
 */

function mockTranslate(text: string, from: string, to: string): string {
  // Заглушка: возвращает псевдоперевод
  return `[MOCK:${from}→${to}] ${text}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function bootstrap(): void {
  const broker = getBroker();

  // ── Перевод слова ─────────────────────────────────────────────────────────
  broker.subscribe<WordTranslateRequestedEvent>(
    EventTopics.WORD_TRANSLATE_REQUESTED,
    async (event) => {
      console.log(`[TranslationService] Translating word "${event.word}" (${event.wordId})`);
      await delay(MOCK_DELAY_MS);

      const translation = mockTranslate(event.word, event.sourceLanguage, event.targetLanguage);

      broker.publish<WordTranslateCompletedEvent>(EventTopics.WORD_TRANSLATE_COMPLETED, {
        wordId: event.wordId,
        userId: event.userId,
        translation,
      });
    }
  );

  // ── Перевод определения ───────────────────────────────────────────────────
  broker.subscribe<DefinitionTranslateRequestedEvent>(
    EventTopics.DEFINITION_TRANSLATE_REQUESTED,
    async (event) => {
      console.log(
        `[TranslationService] Translating definition ${event.definitionId}: "${event.text.slice(0, 40)}..."`
      );
      await delay(MOCK_DELAY_MS);

      const translation = mockTranslate(event.text, event.sourceLanguage, event.targetLanguage);

      broker.publish<DefinitionTranslateCompletedEvent>(
        EventTopics.DEFINITION_TRANSLATE_COMPLETED,
        {
          wordId: event.wordId,
          definitionId: event.definitionId,
          userId: event.userId,
          translation,
        }
      );
    }
  );

  console.log('[TranslationService] 🚀 Mock Translation Service ready');
}

if (require.main === module) {
  bootstrap();
}
