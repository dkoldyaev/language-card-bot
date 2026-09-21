import type { Dictionary, PrismaClient, UserState } from '@prisma/client';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type mockDeep, mockReset } from 'vitest-mock-extended';
import app from '../../app';
import { env } from '../../core/env';
import { prisma } from '../../prisma';

vi.mock('../../prisma');
const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('Dictionaries API', () => {
  const JWT_SECRET = env.JWT_SECRET;
  const userId = 42;
  const username = 'test_user';
  const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '1h' });

  beforeEach(() => {
    mockReset(prismaMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/v1/dictionaries should return dictionaries with active status', async () => {
    prismaMock.userState.findUnique.mockResolvedValue({
      id: 1,
      userId,
      activeDictionaryId: 10,
      currentWordId: null,
      currentDefinitionId: null,
      showVariants: false,
      showDefinitionTranslation: false,
    } as UserState);

    prismaMock.dictionary.findFirst.mockResolvedValue({
      id: 10,
      name: 'ES (EN)',
      targetLanguage: 'es',
      baseLanguage: 'en',
      userId,
      createdAt: new Date(),
    });

    prismaMock.dictionary.findMany.mockResolvedValue([
      {
        id: 10,
        name: 'ES (EN)',
        targetLanguage: 'es',
        baseLanguage: 'en',
        userId,
        createdAt: new Date(),
        _count: { words: 0 },
      },
      {
        id: 11,
        name: 'FR (DE)',
        targetLanguage: 'fr',
        baseLanguage: 'de',
        userId,
        createdAt: new Date(),
        _count: { words: 0 },
      },
    ] satisfies Array<Dictionary & { _count: { words: number } }>);

    const res = await request(app)
      .get('/api/v1/dictionaries')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.dictionaries).toHaveLength(2);
    expect(res.body.activeDictionaryId).toBe(10);
    expect(res.body.dictionaries[0].isActive).toBe(true);
    expect(res.body.dictionaries[1].isActive).toBe(false);
  });

  it('POST /api/v1/dictionaries should create a new dictionary', async () => {
    prismaMock.dictionary.create.mockResolvedValue({
      id: 12,
      name: 'Spanish (English)',
      targetLanguage: 'es',
      baseLanguage: 'en',
      userId,
      createdAt: new Date(),
    } as Dictionary);

    prismaMock.userState.findUnique.mockResolvedValue({
      id: 1,
      userId,
      activeDictionaryId: 10,
      currentWordId: null,
      currentDefinitionId: null,
      showVariants: false,
      showDefinitionTranslation: false,
    } as UserState);

    prismaMock.dictionary.findFirst.mockResolvedValue({
      id: 10,
      name: 'Existing',
      targetLanguage: 'en',
      baseLanguage: 'ru',
      userId,
      createdAt: new Date(),
    });

    prismaMock.dictionary.findMany.mockResolvedValue([]);

    const res = await request(app)
      .post('/api/v1/dictionaries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Spanish (English)',
        targetLanguage: 'es',
        baseLanguage: 'en',
      });

    expect(res.status).toBe(201);
    expect(res.body.dictionary.name).toBe('Spanish (English)');
    expect(res.body.dictionary.targetLanguage).toBe('es');
    expect(res.body.dictionary.baseLanguage).toBe('en');
  });

  it('POST /api/v1/dictionaries/:id/select should select active dictionary', async () => {
    prismaMock.dictionary.findFirst.mockResolvedValue({
      id: 11,
      name: 'FR (DE)',
      targetLanguage: 'fr',
      baseLanguage: 'de',
      userId,
      createdAt: new Date(),
    });

    prismaMock.userState.upsert.mockResolvedValue({
      id: 1,
      userId,
      activeDictionaryId: 11,
      currentWordId: null,
      currentDefinitionId: null,
      showVariants: false,
      showDefinitionTranslation: false,
    });

    const res = await request(app)
      .post('/api/v1/dictionaries/11/select')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.activeDictionaryId).toBe(11);
  });

  it('DELETE /api/v1/dictionaries/:id should delete dictionary', async () => {
    prismaMock.dictionary.findFirst.mockResolvedValue({
      id: 11,
      name: 'FR (DE)',
      targetLanguage: 'fr',
      baseLanguage: 'de',
      userId,
      createdAt: new Date(),
    });

    prismaMock.dictionary.delete.mockResolvedValue({} as Dictionary);
    prismaMock.dictionary.findMany.mockResolvedValue([]);
    prismaMock.userState.findUnique.mockResolvedValue({
      id: 1,
      userId,
      activeDictionaryId: 10,
      currentWordId: null,
      currentDefinitionId: null,
      showVariants: false,
      showDefinitionTranslation: false,
    } as UserState);

    const res = await request(app)
      .delete('/api/v1/dictionaries/11')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Dictionary deleted successfully');
  });

  it('PATCH /api/v1/dictionaries/:id should update dictionary name', async () => {
    prismaMock.dictionary.findFirst.mockResolvedValue({
      id: 11,
      name: 'Old Name',
      targetLanguage: 'fr',
      baseLanguage: 'de',
      userId,
      createdAt: new Date(),
    });

    prismaMock.dictionary.update.mockResolvedValue({
      id: 11,
      name: 'New Custom Name',
      targetLanguage: 'fr',
      baseLanguage: 'de',
      userId,
      createdAt: new Date(),
    } as Dictionary);

    prismaMock.dictionary.findMany.mockResolvedValue([
      {
        id: 11,
        name: 'New Custom Name',
        targetLanguage: 'fr',
        baseLanguage: 'de',
        userId,
        createdAt: new Date(),
        _count: { words: 0 },
      },
    ] satisfies Array<Dictionary & { _count: { words: number } }>);

    prismaMock.userState.findUnique.mockResolvedValue({
      id: 1,
      userId,
      activeDictionaryId: 11,
      currentWordId: null,
      currentDefinitionId: null,
      showVariants: false,
      showDefinitionTranslation: false,
    } as UserState);

    const res = await request(app)
      .patch('/api/v1/dictionaries/11')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Custom Name' });

    expect(res.status).toBe(200);
    expect(res.body.dictionary.name).toBe('New Custom Name');
  });
});
