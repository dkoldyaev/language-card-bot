import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';
import { redisClient } from '../core/cache';
import { DefinerFactory } from '../core/DefinerFactory';
import { SUPPORTED_LANGUAGES } from '../types/language';

const router = Router();

const SingleDefineRequestSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES),
  text: z.string().min(1, 'Text is required'),
  definerApp: z.enum(['mistral', 'gemini', 'mock', 'freedictionary', 'llm'] as const),
});

const BatchDefineRequestSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES),
  texts: z.array(z.string().min(1)).min(1, 'Texts array must not be empty'),
  definerApp: z.enum(['mistral', 'gemini', 'mock', 'freedictionary', 'llm'] as const),
});

const DefineRequestSchema = z.union([BatchDefineRequestSchema, SingleDefineRequestSchema]);

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

    const { language, definerApp } = parseResult.data;
    const isBatch = 'texts' in parseResult.data;
    const texts: string[] = 'texts' in parseResult.data ? parseResult.data.texts : [parseResult.data.text];

    // Check cache for all texts using mget
    const cacheKeys = texts.map((t: string) => `definer:${definerApp}:${language}:${t}`);
    const cachedDefs: Array<string | null> = await redisClient.mget(cacheKeys);

    const uncachedIndices: number[] = [];
    const uncachedTexts: string[] = [];

    const finalDefinitions: Array<unknown> = cachedDefs.map((cached, index) => {
      if (cached === null) {
        uncachedIndices.push(index);
        uncachedTexts.push(texts[index]);
        return null;
      }
      return JSON.parse(cached);
    });

    if (uncachedTexts.length > 0) {
      const definer = DefinerFactory.getDefiner(definerApp);
      const definedBatch = await definer.defineBatch(uncachedTexts, language);

      const pipeline = redisClient.pipeline();
      definedBatch.forEach((defs, i) => {
        const originalIndex = uncachedIndices[i];
        finalDefinitions[originalIndex] = defs;
        const originalText = uncachedTexts[i];
        const cacheKey = `definer:${definerApp}:${language}:${originalText}`;
        pipeline.set(cacheKey, JSON.stringify(defs), 'EX', 365 * 24 * 60 * 60);
      });
      await pipeline.exec();
    }

    if (isBatch) {
      res.json({
        definitions: finalDefinitions,
      });
    } else {
      res.json({
        definitions: finalDefinitions[0] || [],
      });
    }
  } catch (error) {
    next(error);
  }
});

export { router as defineRouter };
