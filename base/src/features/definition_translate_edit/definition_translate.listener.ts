import { appEvents, Events, TranslationAddedPayload } from '../../core/events';
import { prisma } from '../../prisma';
import { publishEvent } from '../event_bus/event_bus.service';
import { DictionaryAddDefinitionProcessedEvent } from '../event_bus/event_bus.type';

// Trigger: Send Mercure event that translation was added or updated
appEvents.on(Events.TRANSLATION_ADDED, async (payload: TranslationAddedPayload) => {
  const { username, wordId, wordText } = payload;
  
  try {
    const totalDefinitions = await prisma.definition.count({ 
      where: { wordId } 
    });
    
    const processedCount = await prisma.definitionTranslation.count({ 
      where: { definition: { wordId } } 
    });
    
    const event: DictionaryAddDefinitionProcessedEvent = {
      version: 'v1',
      type: 'dictionary_add_definition_processed',
      word: wordText,
      processedCount,
      totalDefinitions
    };
    
    await publishEvent(username, event);
  } catch (error) {
    console.error('Error in TRANSLATION_ADDED listener (Mercure):', error);
  }
});
