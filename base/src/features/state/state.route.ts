import { type Request, type Response, Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { LanguageCodeSchema } from '../../types/language';
import { getAuthUser } from '../auth/auth.service';
import { publishEvent } from '../event_bus/event_bus.service';
import type { StateSyncMercureEvent } from '../event_bus/event_bus.type';
import type { SyncResponse } from './state.type';

const router = Router();

router.post('/sync', authMiddleware, async (req: Request, res: Response<SyncResponse | { error: string }>) => {
  const { id: userId, username } = getAuthUser(req);

  try {
    const userState = await prisma.userState.findUnique({
      where: { userId },
      include: {
        activeDictionary: true,
        currentWord: true,
        currentDefinition: {
          include: { translation: true, images: true },
        },
      },
    });

    if (!userState) {
      return res.status(404).json({ error: 'User state not found' });
    }

    const dict = userState.activeDictionary;

    const payload: StateSyncMercureEvent = {
      version: 'v1',
      type: 'state_sync',
      activeDictionaryId: userState.activeDictionaryId,
      activeDictionary: dict ? {
        id: dict.id,
        name: dict.name,
        targetLanguage: LanguageCodeSchema.parse(dict.targetLanguage),
        baseLanguage: LanguageCodeSchema.parse(dict.baseLanguage),
      } : null,
      currentWordId: userState.currentWordId,
      currentWord: userState.currentWord ? { id: userState.currentWord.id, text: userState.currentWord.text } : undefined,
      showVariants: userState.showVariants,
      showDefinitionTranslation: userState.showDefinitionTranslation,
      currentDefinitionId: userState.currentDefinitionId,
      currentDefinition: userState.currentDefinition ? {
        id: userState.currentDefinition.id,
        text: userState.currentDefinition.text,
        translation: userState.currentDefinition.translation ? userState.currentDefinition.translation.text : null,
        images: Array.isArray(userState.currentDefinition.images)
          ? userState.currentDefinition.images.map((img) => ({ id: img.id, url: img.url, source: img.source }))
          : [],
      } : undefined,
    };

    try {
      await publishEvent(username, payload);
    } catch (e) {
      console.error('Failed to publish state to Mercure', e);
      return res.status(500).json({ error: 'Failed to publish to Mercure' });
    }

    res.json({ message: 'State synced to Mercure', state: payload });
  } catch (error) {
    console.error('State sync error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
