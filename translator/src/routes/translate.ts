import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TranslatorFactory } from '../core/TranslatorFactory';
import { redisClient } from '../core/cache';

const router = Router();

const TranslateRequestSchema = z.object({
  sourceLanguage: z.string().min(1, 'Source language is required'),
  targetLanguage: z.string().min(1, 'Target language is required'),
  text: z.string().min(1, 'Text is required'),
  translatorApp: z.enum(['googletranslate', 'mock', 'laratranslate'] as const),
});

router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseResult = TranslateRequestSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid request data',
        details: parseResult.error.issues,
      });
      return;
    }

    const { sourceLanguage, targetLanguage, text, translatorApp } = parseResult.data;

    const cacheKey = `translator:${translatorApp}:${sourceLanguage}:${targetLanguage}:${text}`;
    const cachedResult = await redisClient.get(cacheKey);

    if (cachedResult) {
      res.json({ translatedText: cachedResult });
      return;
    }

    const translator = TranslatorFactory.getTranslator(translatorApp);
    const result = await translator.translate(text, sourceLanguage, targetLanguage);

    // Cache for 1 year
    await redisClient.set(cacheKey, result, 'EX', 365 * 24 * 60 * 60);

    res.json({
      translatedText: result,
    });
  } catch (error) {
    next(error);
  }
});

export { router as translateRouter };
