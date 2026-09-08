import { appEvents, Events, WordAddedPayload } from '../../core/events';
import { enqueueFetchDefinitions } from './add_word.queue';
import { publishEvent } from '../event_bus/event_bus.service';
import { DictionaryAddProcessingEvent } from '../event_bus/event_bus.type';

// 1. Trigger: Send Mercure event that the word appeared in the dictionary
appEvents.on(Events.WORD_ADDED, async (payload: WordAddedPayload) => {
  const { username, wordId, wordText } = payload;
  
  try {
    const processingEvent: DictionaryAddProcessingEvent = {
      version: 'v1',
      type: 'dictionary_add_processing',
      wordId,
      word: wordText
    };
    await publishEvent(username, processingEvent);
  } catch (error) {
    console.error('Error in WORD_ADDED listener (Mercure):', error);
  }
});

// 2. Trigger: Start asynchronous loading of translations (definitions)
appEvents.on(Events.WORD_ADDED, async (payload: WordAddedPayload) => {
  const { userId, username, wordId, wordText, dictionaryId } = payload;
  
  try {
    await enqueueFetchDefinitions(userId, username, wordId, wordText, dictionaryId);
  } catch (error) {
    console.error('Error in WORD_ADDED listener (BullMQ):', error);
  }
});
