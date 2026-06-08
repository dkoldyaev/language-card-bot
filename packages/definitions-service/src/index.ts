import { getBroker } from '@ecb/broker-mock';
import {
  EventTopics,
  WordDefinitionsRequestedEvent,
  WordDefinitionsCompletedEvent,
} from '@ecb/shared';

const MOCK_DELAY_MS = 300;
const MOCK_DEFINITIONS_COUNT = 2;

/**
 * MockDefinitionsService
 *
 * Слушает word.definitions.requested и возвращает синтетические определения.
 *
 * TODO: Заменить mockGetDefinitions() на реальный вызов словарного API
 *       (Merriam-Webster / Oxford / Free Dictionary API).
 */

function mockGetDefinitions(word: string, language: string): Array<{ text: string }> {
  return Array.from({ length: MOCK_DEFINITIONS_COUNT }, (_, i) => ({
    text: `[MOCK:${language}] Definition ${i + 1} of "${word}": a detailed explanation of the term in context.`,
  }));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function bootstrap(): void {
  const broker = getBroker();

  broker.subscribe<WordDefinitionsRequestedEvent>(
    EventTopics.WORD_DEFINITIONS_REQUESTED,
    async (event) => {
      console.log(
        `[DefinitionsService] Loading definitions for "${event.word}" in [${event.language}]`
      );
      await delay(MOCK_DELAY_MS);

      const definitions = mockGetDefinitions(event.word, event.language);

      broker.publish<WordDefinitionsCompletedEvent>(EventTopics.WORD_DEFINITIONS_COMPLETED, {
        wordId: event.wordId,
        userId: event.userId,
        definitions,
      });
    }
  );

  console.log('[DefinitionsService] 🚀 Mock Definitions Service ready');
}

if (require.main === module) {
  bootstrap();
}
