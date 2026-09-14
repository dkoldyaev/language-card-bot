import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { AddWordBatchRequest, AddWordBatchResponse } from './add_word.type';
import { DictionaryAddDuplicateEvent } from '../event_bus/event_bus.type';
import { publishEvent } from '../event_bus/event_bus.service';
import { appEvents, Events } from '../../core/events';
import { getAuthUser } from '../auth/auth.service';
import { ensureActiveDictionary } from '../dictionaries/dictionaries.service';

const router = Router();

router.post('/', authMiddleware, async (req: Request<{}, {}, AddWordBatchRequest>, res: Response<AddWordBatchResponse | { error: string }>) => {
  const { words, dictionaryId } = req.body;

  if (!Array.isArray(words) || words.length === 0) {
    return res.status(400).json({ error: 'Words list is required and cannot be empty' });
  }

  const cleanedWords = words
    .filter((w): w is string => typeof w === 'string')
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 0);

  if (cleanedWords.length === 0) {
    return res.status(400).json({ error: 'At least one valid word is required' });
  }

  const { id: userId, username } = getAuthUser(req);

  try {
    let targetDictionaryId: number;

    if (dictionaryId !== undefined && dictionaryId !== null) {
      const dict = await prisma.dictionary.findFirst({
        where: { id: dictionaryId, userId },
      });
      if (!dict) {
        return res.status(404).json({ error: 'Dictionary not found' });
      }
      targetDictionaryId = dict.id;
    } else {
      const activeDict = await ensureActiveDictionary(userId);
      targetDictionaryId = activeDict.id;
    }

    let addedCount = 0;
    let duplicateCount = 0;

    for (const wordText of cleanedWords) {
      const existingWord = await prisma.word.findUnique({
        where: {
          dictionaryId_text: {
            dictionaryId: targetDictionaryId,
            text: wordText,
          },
        },
      });

      if (existingWord) {
        duplicateCount++;
        const payload: DictionaryAddDuplicateEvent = {
          version: 'v1',
          type: 'dictionary_add_duplicate',
          word: wordText,
        };

        await publishEvent(username, payload).catch((e) => console.error('Mercure publish error:', e));
        continue;
      }

      const newWord = await prisma.word.create({
        data: {
          dictionaryId: targetDictionaryId,
          text: wordText,
        },
      });

      addedCount++;

      appEvents.emit(Events.WORD_ADDED, {
        userId,
        username,
        wordId: newWord.id,
        wordText,
        dictionaryId: targetDictionaryId,
      });
    }

    return res.json({
      message: 'Words processed successfully',
      addedCount,
      duplicateCount,
    });
  } catch (error) {
    console.error('Add word batch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
