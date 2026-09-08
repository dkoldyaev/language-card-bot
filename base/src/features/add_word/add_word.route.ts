import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { AddWordRequest, AddWordResponse } from './add_word.type';
import { DictionaryAddDuplicateEvent } from '../event_bus/event_bus.type';
import { publishEvent } from '../event_bus/event_bus.service';
import { appEvents, Events } from '../../core/events';
import { getAuthUser } from '../auth/auth.service';
import { ensureActiveDictionary } from '../dictionaries/dictionaries.service';

const router = Router();

router.post('/', authMiddleware, async (req: Request<{}, {}, AddWordRequest>, res: Response<AddWordResponse | { error: string }>) => {
  const { word, dictionaryId } = req.body;

  if (!word || typeof word !== 'string' || word.trim() === '') {
    return res.status(400).json({ error: 'Word is required' });
  }

  const wordText = word.trim().toLowerCase();
  const { id: userId, username } = getAuthUser(req);

  try {
    let targetDictionaryId = dictionaryId;

    if (targetDictionaryId) {
      const dict = await prisma.dictionary.findFirst({
        where: { id: targetDictionaryId, userId },
      });
      if (!dict) {
        return res.status(404).json({ error: 'Dictionary not found' });
      }
    } else {
      const activeDict = await ensureActiveDictionary(userId);
      targetDictionaryId = activeDict.id;
    }

    const existingWord = await prisma.word.findUnique({
      where: {
        dictionaryId_text: {
          dictionaryId: targetDictionaryId,
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
        word: wordText,
      };

      await publishEvent(username, payload).catch((e) => console.error('Mercure publish error:', e));

      return res.json({ message: 'Word already exists' });
    }

    const newWord = await prisma.word.create({
      data: {
        dictionaryId: targetDictionaryId,
        text: wordText,
      },
    });

    res.json({ message: 'Word added successfully' });

    appEvents.emit(Events.WORD_ADDED, {
      userId,
      username,
      wordId: newWord.id,
      wordText,
      dictionaryId: targetDictionaryId,
    });
  } catch (error) {
    console.error('Add word error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
