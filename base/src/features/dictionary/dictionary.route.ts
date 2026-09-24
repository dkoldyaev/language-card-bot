import { type Request, type Response, Router } from 'express';
import { z } from 'zod';
import { redisClient } from '../../core/cache';
import { env } from '../../core/env';
import { authMiddleware } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validate';
import { prisma } from '../../prisma';
import { getAuthUser } from '../auth/auth.service';

const router = Router();

import type { Dictionary } from '@prisma/client';

router.get('/', authMiddleware, async (req: Request<Record<string, never>, unknown, unknown, { dictionaryId: string }>, res: Response) => {
  const { id: userId } = getAuthUser(req);
  const rawDictId = req.query.dictionaryId;

  if (!rawDictId) {
    return res.status(400).json({ error: 'dictionaryId query parameter is required' });
  }

  const queryDictId = parseInt(rawDictId, 10);

  if (Number.isNaN(queryDictId)) {
    return res.status(400).json({ error: 'dictionaryId must be a valid number' });
  }

  try {
    const dict = await prisma.dictionary.findFirst({
      where: { id: queryDictId, userId },
    });

    if (!dict) {
      return res.status(404).json({ error: 'Dictionary not found' });
    }

    const dictionary = await prisma.word.findMany({
      where: { dictionaryId: dict.id },
      include: {
        presets: {
          select: {
            id: true,
            title: true,
          },
        },
        definitions: {
          include: {
            translation: true,
            presets: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: {
            id: 'asc'
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });

    res.json({
      dictionary,
      activeDictionaryId: dict.id,
      dictionaryInfo: {
        id: dict.id,
        name: dict.name,
        targetLanguage: dict.targetLanguage,
        baseLanguage: dict.baseLanguage,
      },
    });
  } catch (error) {
    console.error('Fetch dictionary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
