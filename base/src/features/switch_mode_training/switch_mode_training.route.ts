import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { SwitchModeTrainingResponse } from './switch_mode_training.type';
import { StateSyncMercureEvent } from '../event_bus/event_bus.type';
import { publishEvent } from '../event_bus/event_bus.service';
import { UserMode } from '@prisma/client';
import { getAuthUser } from '../auth/auth.service';
import { updateUserMode } from '../state/state.service';

const router = Router();

router.post('/', authMiddleware, async (req: Request, res: Response<SwitchModeTrainingResponse | { error: string }>) => {

  const { id: userId, username } = getAuthUser(req);

  try {
    const userState = await updateUserMode(userId, UserMode.TRAINING);

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

    res.json({ message: 'Switched to training view' });
  } catch (error) {
    console.error('Switch to training error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
