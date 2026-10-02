import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';
import { redisClient } from '../core/cache';
import { ImageGeneratorFactory } from '../core/ImageGeneratorFactory';
import { IMAGE_PROVIDERS } from '../types/image';

const router = Router();

const CACHE_TTL_SECONDS = 365 * 24 * 60 * 60; // 1 year, consistent with translator, definer, llm

export function buildCacheKey(provider: string, keywords: string[]): string {
  const normalizedTokens = keywords
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k.length > 0)
    .sort();
  const queryKey = normalizedTokens.join('+');
  return `image-generator:${provider}:${queryKey}`;
}

const ENGLISH_KEYWORD_REGEX = /^[a-zA-Z0-9\s-]+$/;

const GenerateImagesRequestSchema = z.object({
  keywords: z
    .array(
      z.array(
        z.string().min(1).regex(ENGLISH_KEYWORD_REGEX, 'Each keyword must be in English (ASCII letters, digits, spaces, hyphens)')
      ).min(1, 'Keyword group must not be empty')
    )
    .min(1, 'Keywords array must not be empty'),
  provider: z.enum(IMAGE_PROVIDERS),
});

router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseResult = GenerateImagesRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid request data',
        details: parseResult.error.issues,
      });
      return;
    }

    const { keywords, provider } = parseResult.data;

    const cleanedKeywords = keywords.map((group) =>
      group.map((k) => k.trim()).filter((k) => k.length > 0)
    );

    const cacheKeys = cleanedKeywords.map((group) => buildCacheKey(provider, group));
    const cachedImagesRaw: Array<string | null> = await redisClient.mget(cacheKeys);
    const cachedImages: Array<string[] | null> = cachedImagesRaw.map(raw => raw ? JSON.parse(raw) : null);

    const uncachedIndices: number[] = [];
    const uncachedKeywordGroups: string[][] = [];

    cachedImages.forEach((cached, index) => {
      if (cached === null) {
        uncachedIndices.push(index);
        uncachedKeywordGroups.push(cleanedKeywords[index]);
      }
    });

    const finalImages: string[][] = [...(cachedImages as string[][])];

    if (uncachedKeywordGroups.length > 0) {
      const generator = ImageGeneratorFactory.getGenerator(provider);
      const generatedBatch = await generator.generate(uncachedKeywordGroups);

      const pipeline = redisClient.pipeline();
      let hasKeysToCache = false;

      generatedBatch.forEach((imageUrls, i) => {
        const originalIndex = uncachedIndices[i];
        finalImages[originalIndex] = imageUrls;

        const validUrls = imageUrls.filter(u => u && typeof u === 'string' && u.trim().length > 0);
        if (validUrls.length > 0) {
          const cacheKey = cacheKeys[originalIndex];
          pipeline.set(cacheKey, JSON.stringify(validUrls), 'EX', CACHE_TTL_SECONDS);
          hasKeysToCache = true;
        }
      });

      if (hasKeysToCache) {
        await pipeline.exec();
      }
    }

    res.json(finalImages);
  } catch (error) {
    next(error);
  }
});

export { router as imagesRouter };
