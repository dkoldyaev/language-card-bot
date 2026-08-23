import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { SettingsSyncMercureEvent } from '../event_bus/event_bus.type';
import { publishEvent } from '../event_bus/event_bus.service';
import { getAuthUser } from '../auth/auth.service';

const router = Router();

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const { id: userId } = getAuthUser(req);

  try {
    let settings = await prisma.userSettings.findUnique({
      where: { userId }
    });

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId,
          baseLanguage: 'ru',
          targetLanguage: 'en',
          desiredLevel: 'B2',
        }
      });
    }

    res.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authMiddleware, async (req: Request, res: Response) => {


  const { id: userId, username } = getAuthUser(req);
  const { baseLanguage, targetLanguage, desiredLevel } = req.body;

  try {
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: {
        ...(baseLanguage && { baseLanguage }),
        ...(targetLanguage && { targetLanguage }),
        ...(desiredLevel && { desiredLevel }),
      },
      create: {
        userId,
        baseLanguage: baseLanguage || 'ru',
        targetLanguage: targetLanguage || 'en',
        desiredLevel: desiredLevel || 'B2',
      }
    });

    const payload: SettingsSyncMercureEvent = {
      version: 'v1',
      type: 'settings_sync',
      settings: {
        baseLanguage: settings.baseLanguage,
        targetLanguage: settings.targetLanguage,
        desiredLevel: settings.desiredLevel,
      }
    };

    try {
      await publishEvent(username, payload);
    } catch (e) {
      console.error('Failed to publish settings to Mercure', e);
      return res.status(500).json({ error: 'Failed to publish to Mercure' });
    }

    res.json({ settings, message: 'Settings saved and synced' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
