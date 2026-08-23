import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { publishEvent } from '../event_bus/event_bus.service';

vi.mock('../../prisma');
vi.mock('../event_bus/event_bus.service', () => ({
  publishEvent: vi.fn()
}));

const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('Settings Endpoint', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
  const MERCURE_URL = process.env.MERCURE_URL || 'http://localhost:9090/.well-known/mercure';

  beforeEach(async () => {
    process.env.MERCURE_URL = MERCURE_URL;
    process.env.MERCURE_JWT = 'test_mercure_jwt';
    process.env.JWT_SECRET = JWT_SECRET;

    vi.mocked(publishEvent).mockResolvedValue();

    mockReset(prismaMock);
  });

  afterEach(async () => {
    vi.clearAllMocks();
  });

  it('should return 401 if no token provided', async () => {
    const resGet = await request(app).get('/api/v1/settings');
    expect(resGet.status).toBe(401);

    const resPost = await request(app).post('/api/v1/settings').send({});
    expect(resPost.status).toBe(401);
  });

  it('should get settings and create defaults if not exist', async () => {
    const userId = 20;
    const username = 'test_user';
    const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '1h' });

    prismaMock.userSettings.findUnique.mockResolvedValue(null);
    prismaMock.userSettings.create.mockResolvedValue({
      id: 1,
      userId,
      baseLanguage: 'ru',
      targetLanguage: 'en',
      desiredLevel: 'B2'
    });

    const res = await request(app)
      .get('/api/v1/settings')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.settings.baseLanguage).toBe('ru');

    expect(prismaMock.userSettings.findUnique).toHaveBeenCalledWith({
      where: { userId }
    });
    expect(prismaMock.userSettings.create).toHaveBeenCalledWith({
      data: {
        userId,
        baseLanguage: 'ru',
        targetLanguage: 'en',
        desiredLevel: 'B2',
      }
    });
  });

  it('should update settings', async () => {
    const userId = 20;
    const username = 'test_user';
    const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '1h' });

    prismaMock.userSettings.upsert.mockResolvedValue({
      id: 1,
      userId,
      baseLanguage: 'es',
      targetLanguage: 'fr',
      desiredLevel: 'C1'
    });

    const res = await request(app)
      .post('/api/v1/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        baseLanguage: 'es',
        targetLanguage: 'fr',
        desiredLevel: 'C1'
      });

    expect(res.status).toBe(200);
    expect(res.body.settings.baseLanguage).toBe('es');
    expect(res.body.settings.targetLanguage).toBe('fr');
    expect(res.body.settings.desiredLevel).toBe('C1');

    expect(prismaMock.userSettings.upsert).toHaveBeenCalledWith({
      where: { userId },
      update: {
        baseLanguage: 'es',
        targetLanguage: 'fr',
        desiredLevel: 'C1',
      },
      create: {
        userId,
        baseLanguage: 'es',
        targetLanguage: 'fr',
        desiredLevel: 'C1',
      }
    });

    expect(publishEvent).toHaveBeenCalledTimes(1);
    expect(publishEvent).toHaveBeenCalledWith(username, expect.objectContaining({
      type: 'settings_sync',
      settings: expect.objectContaining({
        baseLanguage: 'es',
        targetLanguage: 'fr',
        desiredLevel: 'C1'
      })
    }));
  });

  it('should update settings partially', async () => {
    const userId = 20;
    const username = 'test_user';
    const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '1h' });

    prismaMock.userSettings.upsert.mockResolvedValue({
      id: 1,
      userId,
      baseLanguage: 'ru',
      targetLanguage: 'de',
      desiredLevel: 'B2'
    });

    const res = await request(app)
      .post('/api/v1/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        targetLanguage: 'de'
      });

    expect(res.status).toBe(200);
    expect(res.body.settings.targetLanguage).toBe('de');

    expect(prismaMock.userSettings.upsert).toHaveBeenCalledWith({
      where: { userId },
      update: {
        targetLanguage: 'de',
      },
      create: {
        userId,
        baseLanguage: 'ru',
        targetLanguage: 'de',
        desiredLevel: 'B2',
      }
    });

    expect(publishEvent).toHaveBeenCalledTimes(1);
    expect(publishEvent).toHaveBeenCalledWith(username, expect.objectContaining({
      settings: expect.objectContaining({
        targetLanguage: 'de'
      })
    }));
  });
});
