import { Router, Request, Response } from 'express';
import { UserRepository } from '@ecb/core-service';
import { asyncHandler, NotFoundError } from '../middleware/errors';

/**
 * GET /api/users/telegram/:telegramId
 * POST /api/users/telegram/:telegramId
 */
export function createUsersRouter(users: UserRepository): Router {
  const router = Router();

  /** Найти пользователя по Telegram ID */
  router.get(
    '/telegram/:telegramId',
    asyncHandler(async (req: Request, res: Response) => {
      const user = users.findByTelegramId(req.params.telegramId);
      if (!user) throw new NotFoundError('Пользователь');
      res.json(user);
    })
  );

  /** Найти или создать пользователя по Telegram ID */
  router.post(
    '/telegram/:telegramId',
    asyncHandler(async (req: Request, res: Response) => {
      const user = users.findOrCreateByTelegramId(req.params.telegramId);
      res.json(user);
    })
  );

  /** Получить пользователя по ID */
  router.get(
    '/:userId',
    asyncHandler(async (req: Request, res: Response) => {
      const user = users.findById(req.params.userId);
      if (!user) throw new NotFoundError('Пользователь', req.params.userId);
      res.json(user);
    })
  );

  return router;
}
