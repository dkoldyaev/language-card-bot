import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validate';
import { EchoMercureEvent } from '../../types/mercure.type';
import { EchoRequestSchema, EchoRequest, EchoResponse } from './echo.type';

const router = Router();

router.post('/echo', authMiddleware, validateRequest(EchoRequestSchema), async (req: Request<{}, {}, EchoRequest>, res: Response<EchoResponse | { error: string }>) => {
  const MERCURE_URL = process.env.MERCURE_URL!;
  const MERCURE_JWT = process.env.MERCURE_JWT!;
  
  // @ts-ignore
  const username = req.user.username;

  const payload: EchoMercureEvent = {
    version: 'v1',
    type: 'echo',
    message: 'Echo successful',
    data: req.body,
    user: {
      username: username
    }
  };

  const BASE_DOMAIN = process.env.BASE_DOMAIN;
  const topic = `${BASE_DOMAIN}/v1/users/${username}`;
  const body = new URLSearchParams({
    topic: topic,
    data: JSON.stringify(payload)
  });

  try {
    const mercureRes = await fetch(MERCURE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MERCURE_JWT}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });
    
    if (!mercureRes.ok) {
      console.error('Mercure returned error:', await mercureRes.text());
    }
  } catch (err) {
    console.error('Failed to publish to mercure:', err);
  }

  res.json({
    message: 'Echo successful',
    data: req.body
  });
});

export default router;
