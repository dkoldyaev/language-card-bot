import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';
import { redisClient } from '../core/cache';
import { TranslatorFactory } from '../core/TranslatorFactory';
import { SUPPORTED_LANGUAGES } from '../types/language';

const router = Router();

const TranslateRequestSchema = z.object({
  sourceLanguage: z.enum(SUPPORTED_LANGUAGES),
  targetLanguage: z.enum(SUPPORTED_LANGUAGES),
  texts: z.array(z.string().min(1)).min(1, 'Texts array must not be empty'),
  translatorApp: z.enum(['googletranslate', 'mock', 'laratranslate', 'llm', 'mistral', 'gemini'] as const),
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

    const { sourceLanguage, targetLanguage, texts, translatorApp } = parseResult.data;

    // Check cache for all texts in batch using mget
    const cacheKeys = texts.map(
      (text) => `translator:${translatorApp}:${sourceLanguage}:${targetLanguage}:${text}`
    );
    const cachedTranslations: Array<string | null> = await redisClient.mget(cacheKeys);

    // Identify which texts need translation
    const uncachedIndices: number[] = [];
    const uncachedTexts: string[] = [];

    cachedTranslations.forEach((cached, index) => {
      if (cached === null) {
        uncachedIndices.push(index);
        uncachedTexts.push(texts[index]);
      }
    });

    const finalTranslations: string[] = [...(cachedTranslations as string[])];

    if (uncachedTexts.length > 0) {
      const translator = TranslatorFactory.getTranslator(translatorApp);
      const translatedBatch = await translator.translate(uncachedTexts, sourceLanguage, targetLanguage);

      // Save to cache via Redis pipeline and place into finalTranslations
      const pipeline = redisClient.pipeline();
      translatedBatch.forEach((translated, i) => {
        const originalIndex = uncachedIndices[i];
        finalTranslations[originalIndex] = translated;
        const originalText = uncachedTexts[i];
        const cacheKey = `translator:${translatorApp}:${sourceLanguage}:${targetLanguage}:${originalText}`;
        pipeline.set(cacheKey, translated, 'EX', 365 * 24 * 60 * 60);
      });
      await pipeline.exec();
    }

    res.json({
      translations: finalTranslations,
    });
  } catch (error) {
    next(error);
  }
});

export { router as translateRouter };
