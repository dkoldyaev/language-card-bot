import { type Request, type Response, Router } from 'express';
import { env } from '../../core/env';

const router = Router();

router.get('/guest-policy', (_req: Request, res: Response) => {
  res.json({
    allowGuestAi: env.ALLOW_GUEST_AI_GENERATION === 'true',
    dailyLimit: parseInt(env.GUEST_AI_DAILY_LIMIT, 10),
  });
});

export default router;
