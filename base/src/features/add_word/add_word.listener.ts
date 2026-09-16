import { appEvents, Events, WordsListAddedPayload } from '../../core/events';
import { enqueueFetchDefinitionsBatch } from './add_word.queue';
import { publishEvent } from '../event_bus/event_bus.service';
import { DictionaryAddProcessingEvent } from '../event_bus/event_bus.type';

// 1. Trigger: Send Mercure event that words appeared in the dictionary
appEvents.on(Events.WORDS_LIST_ADDED, async (payload: WordsListAddedPayload) => {
  const { username, words } = payload;
  if (!words || words.length === 0) return;

  try {
    const processingEvent: DictionaryAddProcessingEvent = {
      version: 'v1',
      type: 'dictionary_add_processing',
      words: words.map((item) => ({
        wordId: item.wordId,
        word: item.wordText,
      })),
    };
    await publishEvent(username, processingEvent);
  } catch (error) {
    console.error('Error in WORDS_LIST_ADDED listener (Mercure):', error);
  }
});

// 2. Trigger: Start asynchronous loading of translations (definitions)
appEvents.on(Events.WORDS_LIST_ADDED, async (payload: WordsListAddedPayload) => {
  const { userId, username, dictionaryId, words } = payload;
  if (!words || words.length === 0) return;

  try {
    await enqueueFetchDefinitionsBatch(
      words.map((item) => ({
        userId,
        username,
        wordId: item.wordId,
        wordText: item.wordText,
        dictionaryId,
      }))
    );
  } catch (error) {
    console.error('Error in WORDS_LIST_ADDED listener (BullMQ):', error);
  }
});
