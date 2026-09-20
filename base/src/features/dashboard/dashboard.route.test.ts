import type { PrismaClient, UserState } from '@prisma/client';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type mockDeep, mockReset } from 'vitest-mock-extended';
import app from '../../app';
import { env } from '../../core/env';
import { prisma } from '../../prisma';

vi.mock('../../prisma');
const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('Dashboard Route', () => {
  const JWT_SECRET = env.JWT_SECRET;

  beforeEach(() => {
    mockReset(prismaMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).get('/api/v1/dashboard/stats');
    expect(res.status).toBe(401);
  });

  it('should return stats for authenticated user', async () => {
    const userId = 99;
    const username = 'dash_user';
    const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '1h' });

    prismaMock.userState.findUnique.mockResolvedValue({
      id: 1,
      userId,
      activeDictionaryId: 5,
      currentWordId: null,
      currentDefinitionId: null,
      showVariants: false,
      showDefinitionTranslation: false,
    } as UserState);

    prismaMock.dictionary.findFirst.mockResolvedValue({
      id: 5,
      name: 'English',
      targetLanguage: 'en',
      baseLanguage: 'ru',
      userId,
      createdAt: new Date(),
    });

    prismaMock.word.findMany.mockResolvedValue([]);
    prismaMock.quizAttempt.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/v1/dashboard/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.stats).toBeDefined();
    expect(res.body.stats.streak).toBe(0);
    expect(res.body.stats.totalWords).toBe(0);
    expect(res.body.stats.mastery).toEqual({
      newWords: 0,
      learningWords: 0,
      masteredWords: 0,
    });
  });
});
