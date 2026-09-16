import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { AddWordBatchRequest, AddWordBatchResponse } from './add_word.type';
import { DictionaryAddDuplicateEvent } from '../event_bus/event_bus.type';
import { publishEvent } from '../event_bus/event_bus.service';
import { appEvents, Events } from '../../core/events';
import { getAuthUser } from '../auth/auth.service';
import { ensureActiveDictionary } from '../dictionaries/dictionaries.service';
import { invalidateDashboardCache } from '../dashboard/dashboard.service';

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

    const existingWordsInDb = await prisma.word.findMany({
      where: {
        dictionaryId: targetDictionaryId,
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
          dictionaryId: targetDictionaryId,
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
      await invalidateDashboardCache(userId, targetDictionaryId);

      appEvents.emit(Events.WORDS_LIST_ADDED, {
        userId,
        username,
        dictionaryId: targetDictionaryId,
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
