import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { AddWordRequest, AddWordResponse } from './add_word.type';
import { DictionaryAddDuplicateEvent } from '../../types/mercure.type';
import { enqueueFetchDefinitions } from './add_word.queue';

const router = Router();

router.post('/', authMiddleware, async (req: Request<{}, {}, AddWordRequest>, res: Response<AddWordResponse | { error: string }>) => {
  const { word } = req.body;

  if (!word || typeof word !== 'string' || word.trim() === '') {
    return res.status(400).json({ error: 'Word is required' });
  }

  const wordText = word.trim().toLowerCase();

  // @ts-ignore
  const userId = req.user.id;
  // @ts-ignore
  const username = req.user.username;

  try {
    const userState = await prisma.userState.findUnique({
      where: { userId }
    });

    if (!userState || userState.mode !== 'DICTIONARY_ADD') {
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

      const MERCURE_URL = process.env.MERCURE_URL!;
      const MERCURE_JWT = process.env.MERCURE_JWT!;
      const BASE_DOMAIN = process.env.BASE_DOMAIN;
      const topic = `${BASE_DOMAIN}/v1/users/${username}`;
      const body = new URLSearchParams({
        topic,
        data: JSON.stringify(payload)
      });

      await fetch(MERCURE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MERCURE_JWT}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });

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
