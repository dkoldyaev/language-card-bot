import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { DefinerFactory } from '../core/DefinerFactory';

const router = Router();

const DefineRequestSchema = z.object({
  language: z.string().min(1, 'Language is required'),
  text: z.string().min(1, 'Text is required'),
  definerApp: z.enum(['mistral', 'gemini', 'mock', 'freedictionary'] as const),
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

    const definer = DefinerFactory.getDefiner(definerApp);
    const result = await definer.define(text, language);

    res.json({
      definitions: result,
    });
  } catch (error) {
    next(error);
  }
});

export { router as defineRouter };
