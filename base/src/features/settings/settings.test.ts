import type { PrismaClient, UserState } from '@prisma/client';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type mockDeep, mockReset } from 'vitest-mock-extended';
import app from '../../app';
import { prisma } from '../../prisma';
import { publishEvent } from '../event_bus/event_bus.service';
import { env } from '../../core/env';

vi.mock('../../prisma');
vi.mock('../event_bus/event_bus.service', () => ({
  publishEvent: vi.fn()
}));

const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('Settings Endpoint', () => {
  const JWT_SECRET = env.JWT_SECRET;
  const MERCURE_URL = 'http://localhost:9090/.well-known/mercure';

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

  it('should return guest policy without auth', async () => {
    const res = await request(app).get('/api/v1/settings/guest-policy');
    expect(res.status).toBe(200);
    expect(typeof res.body.allowGuestAi).toBe('boolean');
    expect(typeof res.body.dailyLimit).toBe('number');
  });

  it('should return 401 if no token provided', async () => {
    const resGet = await request(app).get('/api/v1/settings');
    expect(resGet.status).toBe(401);

    const resPost = await request(app).post('/api/v1/settings').send({});
    expect(resPost.status).toBe(401);
  });

  it('should get settings from active dictionary', async () => {
    const userId = 20;
    const username = 'test_user';
    const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '1h' });

    prismaMock.userState.findUnique.mockResolvedValue({
      id: 1,
      userId,
      activeDictionaryId: 10,
    } as UserState);

    prismaMock.dictionary.findFirst.mockResolvedValue({
      id: 10,
      userId,
      name: 'EN (RU)',
      baseLanguage: 'ru',
      targetLanguage: 'en',
      createdAt: new Date(),
    });

    const res = await request(app)
      .get('/api/v1/settings')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.settings.baseLanguage).toBe('ru');
    expect(res.body.settings.targetLanguage).toBe('en');
    expect(res.body.settings.desiredLevel).toBeUndefined();
  });

  it('should update active dictionary settings without desiredLevel', async () => {
    const userId = 20;
    const username = 'test_user';
    const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '1h' });

    prismaMock.userState.findUnique.mockResolvedValue({
      id: 1,
      userId,
      activeDictionaryId: 10,
    } as UserState);

    prismaMock.dictionary.findFirst.mockResolvedValue({
      id: 10,
      userId,
      name: 'ES (FR)',
      baseLanguage: 'es',
      targetLanguage: 'fr',
      createdAt: new Date(),
    });

    prismaMock.dictionary.update.mockResolvedValue({
      id: 10,
      userId,
      name: 'ES (FR)',
      baseLanguage: 'es',
      targetLanguage: 'fr',
      createdAt: new Date(),
    });

    const res = await request(app)
      .post('/api/v1/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        baseLanguage: 'es',
        targetLanguage: 'fr',
      });

    expect(res.status).toBe(200);
    expect(res.body.settings.baseLanguage).toBe('es');
    expect(res.body.settings.targetLanguage).toBe('fr');
    expect(res.body.settings.desiredLevel).toBeUndefined();

    expect(prismaMock.dictionary.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: {
        baseLanguage: 'es',
        targetLanguage: 'fr',
      }
    });

    expect(publishEvent).toHaveBeenCalledTimes(1);
    expect(publishEvent).toHaveBeenCalledWith(username, {
      version: 'v1',
      type: 'settings_sync',
      settings: {
        baseLanguage: 'es',
        targetLanguage: 'fr',
      }
    });
  });
});
