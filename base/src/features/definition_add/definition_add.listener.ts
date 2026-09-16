import { appEvents, Events, DefinitionAddedPayload } from '../../core/events';
import { enqueueFetchTranslations } from '../add_word/add_word.queue';
import { publishEvent } from '../event_bus/event_bus.service';
import { DictionaryAddDefinitionsReceivedEvent } from '../event_bus/event_bus.type';

// 1. Trigger: Send Mercure event that definition was added
appEvents.on(Events.DEFINITION_ADDED, async (payload: DefinitionAddedPayload) => {
  const { username, wordText, totalDefinitions } = payload;
  
  try {
    const event: DictionaryAddDefinitionsReceivedEvent = {
      version: 'v1',
      type: 'dictionary_add_definitions_received',
      words: [
        {
          wordId: payload.wordId,
          word: wordText,
          definitions: [{ id: payload.definitionId, text: payload.definitionText, presets: payload.presets }]
        }
      ]
    };
    await publishEvent(username, event);
  } catch (error) {
    console.error('Error in DEFINITION_ADDED listener (Mercure):', error);
  }
});

// 2. Trigger: Start asynchronous loading of translation
appEvents.on(Events.DEFINITION_ADDED, async (payload: DefinitionAddedPayload) => {
  const { definitionId, definitionText, userId, username, wordId, wordText } = payload;
  
  try {
    await enqueueFetchTranslations(
      [{ id: definitionId, text: definitionText }],
      userId,
      username,
      wordId,
      wordText,
      payload.sourceLanguage,
      payload.targetLanguage
    );
  } catch (error) {
    console.error('Error in DEFINITION_ADDED listener (BullMQ):', error);
  }
});
