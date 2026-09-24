import { type Request, type Response, Router } from 'express';
import { appEvents, Events } from '../../core/events';
import { authMiddleware } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validate';
import { prisma } from '../../prisma';
import { getAuthUser } from '../auth/auth.service';
import { invalidateDashboardCache } from '../dashboard/dashboard.service';
import { publishEvent } from '../event_bus/event_bus.service';
import type { DictionaryAddDuplicateEvent } from '../event_bus/event_bus.type';
import { type AddWordRequest, AddWordSchema } from './add_word.type';

const router = Router();

router.post('/', authMiddleware, validateRequest(AddWordSchema), async (req: Request<unknown, unknown, AddWordRequest>, res: Response) => {
  const { word, dictionaryId } = req.body;

  const wordText = word.toLowerCase();
  const { id: userId, username } = getAuthUser(req as unknown as Request);

  try {
    const dict = await prisma.dictionary.findFirst({
      where: { id: dictionaryId, userId },
    });
    if (!dict) {
      return res.status(404).json({ error: 'Dictionary not found' });
    }

    const existingWord = await prisma.word.findUnique({
      where: {
        dictionaryId_text: {
          dictionaryId: dictionaryId,
          text: wordText,
        },
      },
      include: {
        definitions: true,
      },
    });

    if (existingWord) {
      const payload: DictionaryAddDuplicateEvent = {
        version: 'v1',
        type: 'dictionary_add_duplicate',
        words: [wordText],
      };

      await publishEvent(username, payload).catch((e) => console.error('Mercure publish error:', e));

      return res.json({ message: 'Word already exists' });
    }

    const newWord = await prisma.word.create({
      data: {
        dictionaryId: dictionaryId,
        text: wordText,
      },
    });

    await invalidateDashboardCache(userId, dictionaryId);

    res.json({ message: 'Word added successfully' });

    appEvents.emit(Events.WORDS_LIST_ADDED, {
      userId,
      username,
      dictionaryId: dictionaryId,
      words: [
        {
          wordId: newWord.id,
          wordText,
        },
      ],
    });
  } catch (error) {
    console.error('Add word error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
