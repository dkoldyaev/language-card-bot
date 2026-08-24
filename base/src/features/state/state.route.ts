import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { StateSyncMercureEvent } from '../event_bus/event_bus.type';
import { publishEvent } from '../event_bus/event_bus.service';
import { UserMode } from '@prisma/client';
import { SyncResponse } from './state.type';
import { getAuthUser } from '../auth/auth.service';
import { getUserState } from './state.service';

const router = Router();

router.post('/sync', authMiddleware, async (req: Request, res: Response<SyncResponse | { error: string }>) => {

  const { id: userId, username } = getAuthUser(req);

  try {
    const userState = await getUserState(userId);

    if (!userState) {
      return res.status(404).json({ error: 'User state not found' });
    }

    const payload: StateSyncMercureEvent = {
      version: 'v1',
      type: 'state_sync',
      mode: userState.mode as UserMode,
      currentWordId: userState.currentWordId
    };

    try {
      await publishEvent(username, payload);
    } catch (e) {
      console.error('Failed to publish state to Mercure', e);
      return res.status(500).json({ error: 'Failed to publish to Mercure' });
    }

    res.json({ message: 'State synced to Mercure', state: payload });
  } catch (error) {
    console.error('State sync error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
