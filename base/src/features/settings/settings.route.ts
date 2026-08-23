import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { SettingsSyncMercureEvent } from '../../types/mercure.type';

const router = Router();

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user.id;

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
  const MERCURE_URL = process.env.MERCURE_URL!;
  const MERCURE_JWT = process.env.MERCURE_JWT!;

  // @ts-ignore
  const userId = req.user.id;
  // @ts-ignore
  const username = req.user.username;
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

    const BASE_DOMAIN = process.env.BASE_DOMAIN;
    const topic = `${BASE_DOMAIN}/v1/users/${username}`;
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
      console.error('Failed to publish settings to Mercure', await mercureRes.text());
      return res.status(500).json({ error: 'Failed to publish to Mercure' });
    }

    res.json({ settings, message: 'Settings saved and synced' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
