import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';
import { redisClient } from '../core/cache';
import { ImageGeneratorFactory } from '../core/ImageGeneratorFactory';
import { IMAGE_PROVIDERS } from '../types/image';

const router = Router();

const GenerateImagesRequestSchema = z.object({
  keywords: z.array(z.array(z.string().min(1))).min(1, 'Keywords array must not be empty'),
  provider: z.enum(IMAGE_PROVIDERS),
});

router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawBody = {
      ...req.body,
      keywords: req.body?.keywords ?? req.body?.keywordGroups,
      provider: req.body?.provider ?? req.body?.imageProvider,
    };

    const parseResult = GenerateImagesRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid request data',
        details: parseResult.error.issues,
      });
      return;
    }

    const { keywords, provider } = parseResult.data;

    const normalizedQueries = keywords.map((group) =>
      group.map((k) => k.trim().toLowerCase()).filter((k) => k.length > 0).join('+')
    );

    const cacheKeys = normalizedQueries.map((q) => `image-generator:${provider}:${q}`);
    const cachedImages: Array<string | null> = await redisClient.mget(cacheKeys);

    const uncachedIndices: number[] = [];
    const uncachedKeywordGroups: string[][] = [];

    cachedImages.forEach((cached, index) => {
      if (cached === null) {
        uncachedIndices.push(index);
        uncachedKeywordGroups.push(keywords[index]);
      }
    });

    const finalImages: string[] = [...(cachedImages as string[])];

    if (uncachedKeywordGroups.length > 0) {
      const generator = ImageGeneratorFactory.getGenerator(provider);
      const generatedBatch = await generator.generate(uncachedKeywordGroups);

      const pipeline = redisClient.pipeline();
      generatedBatch.forEach((imageUrl, i) => {
        const originalIndex = uncachedIndices[i];
        finalImages[originalIndex] = imageUrl;
        const cacheKey = cacheKeys[originalIndex];
        pipeline.set(cacheKey, imageUrl, 'EX', 365 * 24 * 60 * 60);
      });
      await pipeline.exec();
    }

    res.json(finalImages);
  } catch (error) {
    next(error);
  }
});

export { router as imagesRouter };
