import { type Request, type Response, Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { prisma } from '../../prisma';
import type { LanguageCode } from '../../types/language';
import { getAuthUser } from '../auth/auth.service';
import { publishEvent } from '../event_bus/event_bus.service';
import type { DictionariesSyncMercureEvent, StateSyncMercureEvent } from '../event_bus/event_bus.type';
import {
  createDictionary,
  deleteDictionary,
  getUserDictionaries,
  selectDictionary,
  updateDictionary,
} from './dictionaries.service';
import { CreateDictionaryRequestSchema, UpdateDictionaryRequestSchema } from './dictionaries.type';

const router = Router();

// GET all dictionaries for current user
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const { id: userId } = getAuthUser(req);

  try {
    const result = await getUserDictionaries(userId);
    res.json(result);
  } catch (error) {
    console.error('Get dictionaries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create a new dictionary
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const { id: userId, username } = getAuthUser(req);
  const parseResult = CreateDictionaryRequestSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid dictionary data', details: parseResult.error.issues });
  }

  try {
    const dictionary = await createDictionary(userId, parseResult.data);

    // Publish sync event if needed
    const all = await getUserDictionaries(userId);
    const syncEvent: DictionariesSyncMercureEvent = {
      version: 'v1',
      type: 'dictionaries_sync',
      dictionaries: all.dictionaries,
      activeDictionaryId: all.activeDictionaryId,
    };
    await publishEvent(username, syncEvent).catch((err) => console.error('Mercure publish error:', err));

    res.status(201).json({ dictionary });
  } catch (error) {
    console.error('Create dictionary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET single dictionary
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id: userId } = getAuthUser(req);
  const dictId = parseInt(req.params.id as string, 10);

  if (Number.isNaN(dictId)) {
    return res.status(400).json({ error: 'Invalid dictionary ID' });
  }

  try {
    const dict = await prisma.dictionary.findFirst({
      where: { id: dictId, userId },
      include: {
        _count: { select: { words: true } },
      },
    });

    if (!dict) {
      return res.status(404).json({ error: 'Dictionary not found' });
    }

    const userState = await prisma.userState.findUnique({ where: { userId } });

    res.json({
      dictionary: {
        id: dict.id,
        name: dict.name,
        targetLanguage: dict.targetLanguage,
        baseLanguage: dict.baseLanguage,
        wordCount: dict._count.words,
        isActive: userState?.activeDictionaryId === dict.id,
        createdAt: dict.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Get dictionary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH update dictionary
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id: userId, username } = getAuthUser(req);
  const dictId = parseInt(req.params.id as string, 10);

  if (Number.isNaN(dictId)) {
    return res.status(400).json({ error: 'Invalid dictionary ID' });
  }

  const parseResult = UpdateDictionaryRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid dictionary update data' });
  }

  try {
    const updated = await updateDictionary(userId, dictId, parseResult.data);

    const all = await getUserDictionaries(userId);
    const syncEvent: DictionariesSyncMercureEvent = {
      version: 'v1',
      type: 'dictionaries_sync',
      dictionaries: all.dictionaries,
      activeDictionaryId: all.activeDictionaryId,
    };
    await publishEvent(username, syncEvent).catch((err) => console.error('Mercure publish error:', err));

    res.json({ dictionary: updated });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Dictionary not found') {
      return res.status(404).json({ error: 'Dictionary not found' });
    }
    console.error('Update dictionary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE dictionary
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id: userId, username } = getAuthUser(req);
  const dictId = parseInt(req.params.id as string, 10);

  if (Number.isNaN(dictId)) {
    return res.status(400).json({ error: 'Invalid dictionary ID' });
  }

  try {
    await deleteDictionary(userId, dictId);

    const all = await getUserDictionaries(userId);
    const syncEvent: DictionariesSyncMercureEvent = {
      version: 'v1',
      type: 'dictionaries_sync',
      dictionaries: all.dictionaries,
      activeDictionaryId: all.activeDictionaryId,
    };
    await publishEvent(username, syncEvent).catch((err) => console.error('Mercure publish error:', err));

    res.json({ message: 'Dictionary deleted successfully' });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Dictionary not found') {
      return res.status(404).json({ error: 'Dictionary not found' });
    }
    console.error('Delete dictionary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST select active dictionary
router.post('/:id/select', authMiddleware, async (req: Request, res: Response) => {
  const { id: userId, username } = getAuthUser(req);
  const dictId = parseInt(req.params.id as string, 10);

  if (Number.isNaN(dictId)) {
    return res.status(400).json({ error: 'Invalid dictionary ID' });
  }

  try {
    const dict = await selectDictionary(userId, dictId);

    const payload: StateSyncMercureEvent = {
      version: 'v1',
      type: 'state_sync',
      activeDictionaryId: dict.id,
      activeDictionary: {
        id: dict.id,
        name: dict.name,
        targetLanguage: dict.targetLanguage as LanguageCode,
        baseLanguage: dict.baseLanguage as LanguageCode,
      },
      currentWordId: null,
      currentWord: null,
      currentDefinitionId: null,
      currentDefinition: null,
      showVariants: false,
      showDefinitionTranslation: false,
    };

    await publishEvent(username, payload).catch((err) => console.error('Mercure publish error:', err));

    res.json({ message: 'Dictionary selected', activeDictionaryId: dict.id });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Dictionary not found') {
      return res.status(404).json({ error: 'Dictionary not found' });
    }
    console.error('Select dictionary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
