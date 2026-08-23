import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { SwitchToDictionaryEditResponse } from './dictionary_edit.type';
import { StateSyncMercureEvent } from '../event_bus/event_bus.type';
import { publishEvent } from '../event_bus/event_bus.service';
import { UserMode } from '@prisma/client';
import { getAuthUser } from '../auth/auth.service';
import { updateUserMode } from '../state/state.service';

const router = Router();

router.post('/switch_to_dictionary_edit', authMiddleware, async (req: Request, res: Response<SwitchToDictionaryEditResponse | { error: string }>) => {

  const { id: userId, username } = getAuthUser(req);

  try {
    const userState = await updateUserMode(userId, 'EDITING_DICTIONARY');

    const payload: StateSyncMercureEvent = {
      version: 'v1',
      type: 'state_sync',
      mode: userState.mode as UserMode
    };

    try {
      await publishEvent(username, payload);
    } catch (e) {
      console.error('Failed to publish state to Mercure', e);
      return res.status(500).json({ error: 'Failed to publish to Mercure' });
    }

    res.json({ message: 'Switched to dictionary edit view' });
  } catch (error) {
    console.error('Switch to dictionary edit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
