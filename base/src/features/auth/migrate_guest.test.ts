import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../core/env', () => {
  const jwtSecret = env.JWT_SECRET;
  return {
    env: {
      DATABASE_URL: 'postgresql://test@localhost:5432/test',
      JWT_SECRET: jwtSecret,
      PORT: '3001',
      MERCURE_URL: 'http://localhost:9090/.well-known/mercure',
      MERCURE_JWT: 'test_jwt',
      MERCURE_JWT_KEY: 'test_key',
      TRANSLATOR_API_URL: 'http://localhost:3002/api/v1/translate',
      DEFINER_API_URL: 'http://localhost:3003/api/v1/define',
      DEFINER_APP_TYPE: 'freedictionary',
      TRANSLATOR_APP_TYPE: 'laratranslate',
      BASE_DOMAIN: 'http://localhost',
      REDIS_URL: 'redis://localhost:6379',
      CORS_ORIGIN: 'http://localhost:5173',
      GOOGLE_CLIENT_ID: 'mock_google_client_id',
      ENABLE_TEST_AUTH: 'true',
      ENABLE_DB_LOGGING: 'false',
      ALLOW_GUEST_AI_GENERATION: 'false',
      GUEST_AI_DAILY_LIMIT: '10',
      LLM_API_URL: 'http://localhost:3003/api/v1/generate',
      LLM_PROVIDER: 'mock',
      LLM_MODEL: 'mock',
    }
  };
});

import type { PrismaClient } from '@prisma/client';
import { type mockDeep, mockReset } from 'vitest-mock-extended';
import app from '../../app';
import { env } from '../../core/env';
import { prisma } from '../../prisma';

vi.mock('../../prisma');

const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('POST /api/v1/auth/migrate-guest', () => {
  const JWT_SECRET = env.JWT_SECRET;
  const token = jwt.sign({ id: 1, email: 'user@test.local', username: 'testuser' }, JWT_SECRET);

  beforeEach(() => {
    mockReset(prismaMock);
  });

  it('should return 401 if unauthenticated', async () => {
    const response = await request(app)
      .post('/api/v1/auth/migrate-guest')
      .send({
        dictionaries: [],
        words: [],
        quizAttempts: [],
        mode: 'merge',
      });

    expect(response.status).toBe(401);
  });

  it('should return 400 if validation fails', async () => {
    const response = await request(app)
      .post('/api/v1/auth/migrate-guest')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dictionaries: 'invalid',
        mode: 'merge',
      });

    expect(response.status).toBe(400);
  });

  it('should migrate guest data successfully in merge mode', async () => {
    // Mock transaction callback
    prismaMock.$transaction.mockImplementation(async (callback: (tx: PrismaClient) => Promise<unknown>) => {
      const txMock = {
        dictionary: {
          deleteMany: vi.fn(),
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: 10, name: 'English', targetLanguage: 'en', baseLanguage: 'ru' }),
          findMany: vi.fn().mockResolvedValue([
            { id: 10, name: 'English', targetLanguage: 'en', baseLanguage: 'ru', _count: { words: 1 }, createdAt: new Date() }
          ]),
        },
        word: {
          findMany: vi.fn().mockResolvedValue([]),
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: 100, text: 'hello', dictionaryId: 10, definitions: [] }),
          findFirst: vi.fn().mockResolvedValue({ id: 100, text: 'hello' }),
        },
        definition: {
          create: vi.fn().mockResolvedValue({ id: 50, text: 'A greeting', wordId: 100 }),
        },
        definitionTranslation: {
          create: vi.fn().mockResolvedValue({ id: 60, text: 'Привет', definitionId: 50 }),
        },
        quizAttempt: {
          create: vi.fn().mockResolvedValue({ id: 70, userId: 1, wordId: 100, result: 'SUCCESS' }),
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        userState: {
          findUnique: vi.fn().mockResolvedValue({ userId: 1, activeDictionaryId: 10 }),
          upsert: vi.fn().mockResolvedValue({ userId: 1, activeDictionaryId: 10 }),
        },
      };
      return callback(txMock as unknown as PrismaClient);
    });

    const response = await request(app)
      .post('/api/v1/auth/migrate-guest')
      .set('Authorization', `Bearer ${token}`)
      .send({
        dictionaries: [{ name: 'English', targetLanguage: 'en', baseLanguage: 'ru' }],
        words: [
          {
            text: 'hello',
            targetLanguage: 'en',
            baseLanguage: 'ru',
            definitions: [{ text: 'A greeting', translation: 'Привет' }],
          },
        ],
        quizAttempts: [
          {
            wordText: 'hello',
            result: 'SUCCESS',
            createdAt: new Date().toISOString(),
          },
        ],
        mode: 'merge',
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Guest data migrated successfully');
    expect(response.body.dictionaries).toHaveLength(1);
    expect(response.body.activeDictionaryId).toBe(10);
  });
});
