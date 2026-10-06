import { appEvents, type DefinitionAddedPayload, Events, type ImageAddedPayload } from '../../core/events';
import { publishEvent } from '../event_bus/event_bus.service';
import type { DefinitionImagesLoadedEvent } from '../event_bus/event_bus.type';
import { getUserFeatureFlags } from '../user_features/user_features.service';
import { enqueueFetchImages } from './image.queue';

// 1. Trigger: As soon as a definition is added, enqueue background image generation
appEvents.on(Events.DEFINITION_ADDED, async (payload: DefinitionAddedPayload) => {
  try {
    const features = await getUserFeatureFlags(payload.userId);
    if (!features.cardImages) {
      return;
    }

    await enqueueFetchImages([
      {
        definitionId: payload.definitionId,
        definitionText: payload.definitionText,
        userId: payload.userId,
        username: payload.username,
        wordId: payload.wordId,
        wordText: payload.wordText,
      },
    ]);
  } catch (error) {
    console.error('Error in DEFINITION_ADDED image listener (BullMQ):', error);
  }
});

// 2. Trigger: Send Mercure event when images are loaded
appEvents.on(Events.IMAGE_ADDED, async (payload: ImageAddedPayload) => {
  if (!payload.username) return;

  try {
    const event: DefinitionImagesLoadedEvent = {
      version: 'v1',
      type: 'definition_images_loaded',
      wordId: payload.wordId,
      definitions: payload.definitions,
    };
    await publishEvent(payload.username, event);
  } catch (error) {
    console.error('Error in IMAGE_ADDED listener (Mercure):', error);
  }
});
