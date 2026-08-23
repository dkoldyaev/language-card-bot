import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { SwitchToDictionaryAddResponse } from './dictionary_add.type';
import { StateSyncMercureEvent } from '../../types/mercure.type';
import { UserMode } from '@prisma/client';

const router = Router();

router.post('/switch_to_dictionary_add', authMiddleware, async (req: Request, res: Response<SwitchToDictionaryAddResponse | { error: string }>) => {
  const MERCURE_URL = process.env.MERCURE_URL;
  const MERCURE_JWT = process.env.MERCURE_JWT;

  // @ts-ignore
  const userId = req.user.id;
  // @ts-ignore
  const username = req.user.username;

  try {
    const userState = await prisma.userState.update({
      where: { userId },
      data: { mode: 'DICTIONARY_ADD' }
    });

    const payload: StateSyncMercureEvent = {
      version: 'v1',
      type: 'state_sync',
      mode: userState.mode as UserMode
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

    res.json({ message: 'Switched to dictionary add view' });
  } catch (error) {
    console.error('Switch to dictionary add error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
