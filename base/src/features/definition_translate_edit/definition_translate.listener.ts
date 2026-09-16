import { appEvents, Events, TranslationAddedPayload } from '../../core/events';
import { publishEvent } from '../event_bus/event_bus.service';
import { DefinitionTranslateLoadedEvent } from '../event_bus/event_bus.type';

// Trigger: Send Mercure event that translation was added or updated
appEvents.on(Events.TRANSLATION_ADDED, async (payload: TranslationAddedPayload) => {
  const { username, wordId, definitions } = payload;
  
  try {
    const event: DefinitionTranslateLoadedEvent = {
      version: 'v1',
      type: 'definition_translate_loaded',
      words: [
        {
          wordId,
          definitions
        }
      ]
    };
    
    await publishEvent(username, event);
  } catch (error) {
    console.error('Error in TRANSLATION_ADDED listener (Mercure):', error);
  }
});
