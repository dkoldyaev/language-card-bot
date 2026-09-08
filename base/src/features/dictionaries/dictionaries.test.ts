import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';

vi.mock('../../prisma');
const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('Dictionaries API', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
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
    } as any);

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
        _count: { words: 5 },
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
    ] as any);

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
    } as any);

    prismaMock.userState.findUnique.mockResolvedValue({
      id: 1,
      userId,
      activeDictionaryId: 10,
      currentWordId: null,
      currentDefinitionId: null,
      showVariants: false,
      showDefinitionTranslation: false,
    } as any);

    prismaMock.dictionary.findFirst.mockResolvedValue({
      id: 10,
      name: 'Existing',
      targetLanguage: 'en',
      baseLanguage: 'ru',
      userId,
      createdAt: new Date(),
    });

    prismaMock.dictionary.findMany.mockResolvedValue([] as any);

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
    } as any);

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

    prismaMock.dictionary.delete.mockResolvedValue({} as any);
    prismaMock.userState.findUnique.mockResolvedValue({
      id: 1,
      userId,
      activeDictionaryId: 10,
      currentWordId: null,
      currentDefinitionId: null,
      showVariants: false,
      showDefinitionTranslation: false,
    } as any);

    const res = await request(app)
      .delete('/api/v1/dictionaries/11')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Dictionary deleted successfully');
  });
});
