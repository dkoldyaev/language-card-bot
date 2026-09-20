import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';
import { redisClient } from '../core/cache';
import { DefinerFactory } from '../core/DefinerFactory';
import { SUPPORTED_LANGUAGES } from '../types/language';

const router = Router();

const DefineRequestSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES),
  text: z.string().min(1, 'Text is required'),
  definerApp: z.enum(['mistral', 'gemini', 'mock', 'freedictionary', 'llm'] as const),
});

router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseResult = DefineRequestSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid request data',
        details: parseResult.error.issues,
      });
      return;
    }

    const { language, text, definerApp } = parseResult.data;

    const cacheKey = `definer:${definerApp}:${language}:${text}`;
    const cachedResult = await redisClient.get(cacheKey);

    if (cachedResult) {
      res.json({ definitions: JSON.parse(cachedResult) });
      return;
    }

    const definer = DefinerFactory.getDefiner(definerApp);
    const result = await definer.define(text, language);

    // Cache for 1 year
    await redisClient.set(cacheKey, JSON.stringify(result), 'EX', 365 * 24 * 60 * 60);

    res.json({
      definitions: result,
    });
  } catch (error) {
    next(error);
  }
});

export { router as defineRouter };
