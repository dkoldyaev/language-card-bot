import { type Request, type Response, Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validate';
import { getAuthUser } from '../auth/auth.service';
import { publishEvent } from '../event_bus/event_bus.service';
import type { EchoMercureEvent } from '../event_bus/event_bus.type';
import { EchoRequestSchema, type EchoResponse } from './echo.type';

const router = Router();

router.post('/echo', authMiddleware, validateRequest(EchoRequestSchema), async (req: Request, res: Response<EchoResponse | { error: string }>) => {

  
  const { username } = getAuthUser(req);

  const payload: EchoMercureEvent = {
    version: 'v1',
    type: 'echo',
    message: 'Echo successful',
    data: req.body,
    user: {
      username: username
    }
  };

  try {
    await publishEvent(username, payload);
  } catch (err) {
    console.error('Failed to publish to mercure:', err);
  }

  res.json({
    message: 'Echo successful',
    data: req.body
  });
});

export default router;
