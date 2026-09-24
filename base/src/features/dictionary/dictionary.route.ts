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
import { SUPPORTED_LANGUAGES } from '../../types/language';

const DefineGuestSchema = z.object({
  word: z.string().min(1),
  targetLanguage: z.enum(SUPPORTED_LANGUAGES),
  baseLanguage: z.enum(SUPPORTED_LANGUAGES),
});

router.post('/define-guest', validateRequest(DefineGuestSchema), async (req: Request, res: Response) => {
  if (env.ALLOW_GUEST_AI_GENERATION !== 'true') {
    return res.status(403).json({
      error: 'Guest AI generation is disabled',
      code: 'GUEST_AI_DISABLED',
    });
  }

  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const today = new Date().toISOString().slice(0, 10);
  const redisKey = `guest_ai_limit:${clientIp}:${today}`;
  const dailyLimit = parseInt(env.GUEST_AI_DAILY_LIMIT, 10);

  try {
    const currentCount = await redisClient.incr(redisKey);
    if (currentCount === 1) {
      await redisClient.expire(redisKey, 86400);
    }
    if (currentCount > dailyLimit) {
      return res.status(429).json({
        error: 'Daily guest AI limit reached',
        code: 'GUEST_AI_LIMIT_REACHED',
      });
    }

    const { word, targetLanguage, baseLanguage } = req.body;
    const definerRes = await fetch(env.DEFINER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: targetLanguage,
        text: word.trim().toLowerCase(),
        definerApp: env.DEFINER_APP_TYPE,
      }),
    });

    if (!definerRes.ok) {
      return res.status(502).json({ error: 'Failed to fetch definitions from definer' });
    }

    const definerData = (await definerRes.json()) as {
      definitions?: Array<string | { text: string; tags?: string[]; partOfSpeech?: string | null; levels?: string[] }>;
    };
    const definitions = definerData.definitions || [];

    const definitionsWithTranslations = await Promise.all(
      definitions.slice(0, 3).map(async (def) => {
        const defText = typeof def === 'string' ? def : def.text;
        const tags = typeof def === 'string' ? [] : (def.tags || []);
        const partOfSpeech = typeof def === 'string' ? null : (def.partOfSpeech || null);
        const levels = typeof def === 'string' ? [] : (def.levels || []);

        let translationText: string | null = null;
        try {
          const transRes = await fetch(env.TRANSLATOR_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: defText,
              fromLanguage: targetLanguage,
              toLanguage: baseLanguage,
              translatorApp: env.TRANSLATOR_APP_TYPE,
            }),
          });
          if (transRes.ok) {
            const transData = (await transRes.json()) as { translation?: string };
            translationText = transData.translation || null;
          }
        } catch (e) {
          console.error('Failed to translate definition for guest:', e);
        }

        return {
          id: Date.now() + Math.floor(Math.random() * 10000),
          text: defText,
          tags,
          partOfSpeech,
          levels,
          translation: translationText ? { id: Date.now() + Math.floor(Math.random() * 10000), text: translationText } : null,
        };
      })
    );

    res.json({
      word: word.trim().toLowerCase(),
      definitions: definitionsWithTranslations,
    });
  } catch (error: unknown) {
    console.error('Error in define-guest:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});


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
