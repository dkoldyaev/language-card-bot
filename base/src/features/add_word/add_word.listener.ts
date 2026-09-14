import { appEvents, Events, WordsListAddedPayload } from '../../core/events';
import { enqueueFetchDefinitions } from './add_word.queue';
import { publishEvent } from '../event_bus/event_bus.service';
import { DictionaryAddProcessingEvent } from '../event_bus/event_bus.type';

// 1. Trigger: Send Mercure event that words appeared in the dictionary
appEvents.on(Events.WORDS_LIST_ADDED, async (payload: WordsListAddedPayload) => {
  const { username, words } = payload;
  
  for (const item of words) {
    try {
      const processingEvent: DictionaryAddProcessingEvent = {
        version: 'v1',
        type: 'dictionary_add_processing',
        wordId: item.wordId,
        word: item.wordText,
      };
      await publishEvent(username, processingEvent);
    } catch (error) {
      console.error('Error in WORDS_LIST_ADDED listener (Mercure):', error);
    }
  }
});

// 2. Trigger: Start asynchronous loading of translations (definitions)
appEvents.on(Events.WORDS_LIST_ADDED, async (payload: WordsListAddedPayload) => {
  const { userId, username, dictionaryId, words } = payload;
  
  for (const item of words) {
    try {
      await enqueueFetchDefinitions(userId, username, item.wordId, item.wordText, dictionaryId);
    } catch (error) {
      console.error('Error in WORDS_LIST_ADDED listener (BullMQ):', error);
    }
  }
});
