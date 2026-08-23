import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validate';
import { EchoMercureEvent } from '../event_bus/event_bus.type';
import { publishEvent } from '../event_bus/event_bus.service';
import { EchoRequestSchema, EchoRequest, EchoResponse } from './echo.type';
import { getAuthUser } from '../auth/auth.service';

const router = Router();

router.post('/echo', authMiddleware, validateRequest(EchoRequestSchema), async (req: Request<{}, {}, EchoRequest>, res: Response<EchoResponse | { error: string }>) => {

  
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
