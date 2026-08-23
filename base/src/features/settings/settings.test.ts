import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';

vi.mock('../../prisma');

const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('Settings Endpoint', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
  const MERCURE_URL = process.env.MERCURE_URL || 'http://localhost:9090/.well-known/mercure';

  beforeEach(async () => {
    process.env.MERCURE_URL = MERCURE_URL;
    process.env.MERCURE_JWT = 'test_mercure_jwt';
    process.env.JWT_SECRET = JWT_SECRET;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('ok')
    });

    mockReset(prismaMock);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
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

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchArgs = vi.mocked(global.fetch).mock.calls[0];
    expect(fetchArgs[0]).toBe(MERCURE_URL);
    
    const bodyStr = fetchArgs[1]?.body as string;
    const searchParams = new URLSearchParams(bodyStr);
    expect(searchParams.get('topic')).toBe(`${process.env.BASE_DOMAIN}/v1/users/${username}`);
    
    const mercureData = JSON.parse(searchParams.get('data') || '{}');
    expect(mercureData.type).toBe('settings_sync');
    expect(mercureData.settings.baseLanguage).toBe('es');
    expect(mercureData.settings.targetLanguage).toBe('fr');
    expect(mercureData.settings.desiredLevel).toBe('C1');
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

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchArgs = vi.mocked(global.fetch).mock.calls[0];
    const bodyStr = fetchArgs[1]?.body as string;
    const searchParams = new URLSearchParams(bodyStr);
    
    const mercureData = JSON.parse(searchParams.get('data') || '{}');
    expect(mercureData.settings.targetLanguage).toBe('de');
  });
});
