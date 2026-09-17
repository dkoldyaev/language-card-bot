import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { SettingsSyncMercureEvent } from '../event_bus/event_bus.type';
import { publishEvent } from '../event_bus/event_bus.service';
import { getAuthUser } from '../auth/auth.service';
import { ensureActiveDictionary } from '../dictionaries/dictionaries.service';
import { env } from '../../core/env';

const router = Router();

router.get('/guest-policy', (req: Request, res: Response) => {
  res.json({
    allowGuestAi: env.ALLOW_GUEST_AI_GENERATION === 'true',
    dailyLimit: parseInt(env.GUEST_AI_DAILY_LIMIT, 10),
  });
});

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const { id: userId } = getAuthUser(req);

  try {
    const dict = await ensureActiveDictionary(userId);

    res.json({
      settings: {
        baseLanguage: dict.baseLanguage,
        targetLanguage: dict.targetLanguage,
      },
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const { id: userId, username } = getAuthUser(req);
  const { baseLanguage, targetLanguage } = req.body;

  try {
    const dict = await ensureActiveDictionary(userId);

    const updated = await prisma.dictionary.update({
      where: { id: dict.id },
      data: {
        ...(baseLanguage && { baseLanguage: baseLanguage.toLowerCase() }),
        ...(targetLanguage && { targetLanguage: targetLanguage.toLowerCase() }),
      },
    });

    const payload: SettingsSyncMercureEvent = {
      version: 'v1',
      type: 'settings_sync',
      settings: {
        baseLanguage: updated.baseLanguage,
        targetLanguage: updated.targetLanguage,
      },
    };

    try {
      await publishEvent(username, payload);
    } catch (e) {
      console.error('Failed to publish settings to Mercure', e);
      return res.status(500).json({ error: 'Failed to publish to Mercure' });
    }

    res.json({
      settings: {
        baseLanguage: updated.baseLanguage,
        targetLanguage: updated.targetLanguage,
      },
      message: 'Settings saved and synced',
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
