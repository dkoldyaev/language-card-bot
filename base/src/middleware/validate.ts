import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodSchema } from 'zod';

export const validateRequest = (schema: ZodSchema, target: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[target]);
      if (target === 'body') {
        req.body = parsed;
      } else {
        // req.query and req.params are getters in Express and cannot be reassigned directly.
        // We mutate their properties for backward compatibility, but handlers should use res.locals.validatedData
        Object.keys(parsed as Record<string, unknown>).forEach(key => {
          (req[target] as Record<string, unknown>)[key] = (parsed as Record<string, unknown>)[key];
        });
      }
      res.locals.validatedData = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.issues
        });
      }
      next(error);
    }
  };
};
