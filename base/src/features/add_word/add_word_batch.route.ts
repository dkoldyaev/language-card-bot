import { type Request, type Response, Router } from 'express';
import { appEvents, Events } from '../../core/events';
import { authMiddleware } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { getAuthUser } from '../auth/auth.service';
import { invalidateDashboardCache } from '../dashboard/dashboard.service';
import { publishEvent } from '../event_bus/event_bus.service';
import type { DictionaryAddDuplicateEvent } from '../event_bus/event_bus.type';
import type { AddWordBatchRequest, AddWordBatchResponse } from './add_word.type';

const router = Router();

router.post('/', authMiddleware, async (req: Request<Record<string, never>, unknown, AddWordBatchRequest>, res: Response<AddWordBatchResponse | { error: string }>) => {
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
    const dict = await prisma.dictionary.findFirst({
      where: { id: dictionaryId, userId },
    });
    if (!dict) {
      return res.status(404).json({ error: 'Dictionary not found' });
    }

    const existingWordsInDb = await prisma.word.findMany({
      where: {
        dictionaryId: dictionaryId,
        text: { in: cleanedWords },
      },
      select: {
        text: true,
      },
    });

    const existingWordSet = new Set(existingWordsInDb.map((w) => w.text));
    const seenWords = new Set<string>();
    const duplicateWords: string[] = [];
    const wordsToCreate: string[] = [];

    for (const wordText of cleanedWords) {
      if (existingWordSet.has(wordText) || seenWords.has(wordText)) {
        duplicateWords.push(wordText);
      } else {
        seenWords.add(wordText);
        wordsToCreate.push(wordText);
      }
    }

    if (duplicateWords.length > 0) {
      const payload: DictionaryAddDuplicateEvent = {
        version: 'v1',
        type: 'dictionary_add_duplicate',
        words: duplicateWords,
      };

      await publishEvent(username, payload).catch((e) => console.error('Mercure publish error:', e));
    }

    let createdWords: { id: number; text: string; dictionaryId: number }[] = [];

    if (wordsToCreate.length > 0) {
      createdWords = await prisma.word.createManyAndReturn({
        data: wordsToCreate.map((text) => ({
          dictionaryId: dictionaryId,
          text,
        })),
        select: {
          id: true,
          text: true,
          dictionaryId: true,
        },
        skipDuplicates: true,
      });
    }

    if (createdWords.length > 0) {
      await invalidateDashboardCache(userId, dictionaryId);

      appEvents.emit(Events.WORDS_LIST_ADDED, {
        userId,
        username,
        dictionaryId: dictionaryId,
        words: createdWords.map((createdWord) => ({
          wordId: createdWord.id,
          wordText: createdWord.text,
        })),
      });
    }

    return res.json({
      message: 'Words processed successfully',
      addedCount: createdWords.length,
      duplicateCount: duplicateWords.length,
    });
  } catch (error) {
    console.error('Add word batch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
