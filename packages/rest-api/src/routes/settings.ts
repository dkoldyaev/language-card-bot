import { Router, Request, Response } from 'express';
import { UserRepository } from '@ecb/core-service';
import { asyncHandler, NotFoundError, validate } from '../middleware/errors';
import { UpdateSettingsSchema } from '../validation';

/**
 * GET  /api/users/:userId/settings
 * PUT  /api/users/:userId/settings
 */
export function createSettingsRouter(users: UserRepository): Router {
  const router = Router({ mergeParams: true });

  /** Получить настройки */
  router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      const user = users.findById(req.params.userId);
      if (!user) throw new NotFoundError('Пользователь', req.params.userId);
      res.json(user.settings);
    })
  );

  /** Обновить настройки (частичное обновление) */
  router.put(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      const user = users.findById(req.params.userId);
      if (!user) throw new NotFoundError('Пользователь', req.params.userId);

      const body = validate(UpdateSettingsSchema, req.body);
      const updated = users.updateSettings(req.params.userId, body);
      res.json(updated.settings);
    })
  );

  return router;
}
