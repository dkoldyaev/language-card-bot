import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../prisma';

const router = Router();

router.post('/sync', authMiddleware, async (req: Request, res: Response) => {
  const MERCURE_URL = process.env.MERCURE_URL;
  const MERCURE_JWT = process.env.MERCURE_JWT;

  // @ts-ignore
  const userId = req.user.id;
  // @ts-ignore
  const username = req.user.username;

  try {
    const userState = await prisma.userState.findUnique({
      where: { userId }
    });

    if (!userState) {
      return res.status(404).json({ error: 'User state not found' });
    }

    const payload = {
      version: 'v1',
      type: 'state_sync',
      mode: userState.mode
    };

    if (MERCURE_URL && MERCURE_JWT) {
      const topic = `http://localhost/v1/users/${username}/state`;
      const body = new URLSearchParams({
        topic: topic,
        data: JSON.stringify(payload)
      });

      const mercureRes = await fetch(MERCURE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MERCURE_JWT}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });

      if (!mercureRes.ok) {
        console.error('Failed to publish state to Mercure', await mercureRes.text());
        return res.status(500).json({ error: 'Failed to publish to Mercure' });
      }
    }

    res.json({ message: 'State synced to Mercure', state: payload });
  } catch (error) {
    console.error('State sync error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
