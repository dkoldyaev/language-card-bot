import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { AddWordRequest, AddWordResponse } from './add_word.type';
import { DictionaryAddDuplicateEvent } from '../event_bus/event_bus.type';
import { publishEvent } from '../event_bus/event_bus.service';
import { enqueueFetchDefinitions } from './add_word.queue';
import { getAuthUser } from '../auth/auth.service';
import { getUserState } from '../state/state.service';
import { UserMode } from '@prisma/client';

const router = Router();

router.post('/', authMiddleware, async (req: Request<{}, {}, AddWordRequest>, res: Response<AddWordResponse | { error: string }>) => {
  const { word } = req.body;

  if (!word || typeof word !== 'string' || word.trim() === '') {
    return res.status(400).json({ error: 'Word is required' });
  }

  const wordText = word.trim().toLowerCase();

  const { id: userId, username } = getAuthUser(req);

  try {
    const userState = await getUserState(userId);

    if (!userState || userState.mode !== UserMode.DICTIONARY_ADD) {
      return res.status(403).json({ error: 'User is not in DICTIONARY_ADD mode' });
    }

    const existingWord = await prisma.word.findUnique({
      where: {
        userId_text: {
          userId,
          text: wordText
        }
      },
      include: {
        definitions: true
      }
    });

    if (existingWord) {
      const payload: DictionaryAddDuplicateEvent = {
        version: 'v1',
        type: 'dictionary_add_duplicate',
        word: wordText,
        definitionsCount: existingWord.definitions.length
      };

      await publishEvent(username, payload);

      return res.json({ message: 'Word already exists' });
    }

    const newWord = await prisma.word.create({
      data: {
        userId,
        text: wordText
      }
    });

    res.json({ message: 'Word added successfully' });

    // Background processing via BullMQ
    await enqueueFetchDefinitions(userId, username, newWord.id, wordText);

  } catch (error) {
    console.error('Add word error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
