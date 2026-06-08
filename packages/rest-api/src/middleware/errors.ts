import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Типизированные ошибки приложения
// ─────────────────────────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(404, id ? `${resource} '${id}' не найден` : `${resource} не найден`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, public readonly existing?: unknown) {
    super(409, message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, message, details);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// validate() — хелпер для использования Zod в роутерах
// ─────────────────────────────────────────────────────────────────────────────

import { ZodSchema } from 'zod';

/**
 * Парсит и валидирует данные через Zod-схему.
 * При ошибке бросает ValidationError с читаемыми деталями.
 */
export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.errors.map((e) => ({
      path: e.path.join('.') || 'root',
      message: e.message,
    }));
    throw new ValidationError('Ошибка валидации запроса', details);
  }
  return result.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// asyncHandler — обёртка для async-роутеров, пробрасывает ошибки в next()
// ─────────────────────────────────────────────────────────────────────────────

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Центральный обработчик ошибок (Express error middleware)
// ─────────────────────────────────────────────────────────────────────────────

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod ошибка (если бросается напрямую, без validate())
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      path: e.path.join('.') || 'root',
      message: e.message,
    }));
    res.status(400).json({ error: 'Ошибка валидации запроса', details });
    return;
  }

  // Типизированные ошибки приложения
  if (err instanceof AppError) {
    const body: Record<string, unknown> = { error: err.message };
    if (err.details !== undefined) body.details = err.details;
    if (err instanceof ConflictError && err.existing !== undefined) {
      body.existing = err.existing;
    }
    res.status(err.statusCode).json(body);
    return;
  }

  // Непредвиденные ошибки
  console.error('[RestAPI] Unhandled error:', err);
  res.status(500).json({
    error: 'Внутренняя ошибка сервера',
    ...(process.env.NODE_ENV !== 'production' && {
      details: err instanceof Error ? err.message : String(err),
    }),
  });
}
