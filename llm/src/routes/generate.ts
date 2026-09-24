import crypto from 'node:crypto';
import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';
import { redisClient } from '../core/cache';
import { LLMProviderFactory } from '../core/LLMProviderFactory';

const router = Router();

const GenerateRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  provider: z.enum(['mistral', 'gemini', 'mock'] as const),
  model: z.string().min(1, 'Model is required'),
  jsonFormat: z.union([
    z.string().min(1, 'jsonFormat description is required'),
    z.record(z.string(), z.unknown()),
  ]),
});

router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Also accept responseFormat or schema as alias for jsonFormat if jsonFormat is missing
    const rawBody = {
      ...req.body,
      jsonFormat: req.body?.jsonFormat ?? req.body?.responseFormat ?? req.body?.schema,
    };

    const parseResult = GenerateRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid request data',
        details: parseResult.error.issues,
      });
      return;
    }

    const { prompt, provider, model, jsonFormat } = parseResult.data;

    const formatStr = typeof jsonFormat === 'string' ? jsonFormat : JSON.stringify(jsonFormat);
    const hash = crypto
      .createHash('sha256')
      .update(`${prompt}:${formatStr}`)
      .digest('hex');
    const cacheKey = `llm:${provider}:${model}:${hash}`;

    const cachedResult = await redisClient.get(cacheKey);
    if (cachedResult) {
      res.json({
        data: JSON.parse(cachedResult),
      });
      return;
    }

    const llmProvider = LLMProviderFactory.getProvider(provider);
    const result = await llmProvider.generate({
      prompt,
      model,
      jsonFormat,
    });

    // Cache for 1 year
    await redisClient.set(cacheKey, JSON.stringify(result), 'EX', 365 * 24 * 60 * 60);

    res.json({
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export { router as generateRouter };
