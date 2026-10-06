import type { PrismaClient, UserState, Word } from '@prisma/client';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type mockDeep, mockReset } from 'vitest-mock-extended';
import app from '../../app';
import { env } from '../../core/env';
import { prisma } from '../../prisma';

vi.mock('../../prisma');
const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('Dictionary Fetch Endpoint', () => {
  const JWT_SECRET = env.JWT_SECRET;

  beforeEach(() => {
    mockReset(prismaMock);
    prismaMock.userFeatureFlag.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if no token is provided', async () => {
    const res = await request(app).get('/api/v1/dictionary');
    expect(res.status).toBe(401);
  });

  it.each([
    ['/api/v1/dictionary', 'dictionaryId query parameter is required'],
    ['/api/v1/dictionary?dictionaryId=not-a-number', 'dictionaryId must be a valid number'],
  ])('rejects an invalid dictionary query: %s', async (url, error) => {
    const token = jwt.sign({ id: 42, username: 'test_user' }, JWT_SECRET, { expiresIn: '1h' });

    const res = await request(app)
      .get(url)
      .set('Authorization', `Bearer ${token}`);

    expect(res).toMatchObject({ status: 400, body: { error } });
    expect(prismaMock.word.findMany).not.toHaveBeenCalled();
  });

  it('does not return a dictionary that does not belong to the authenticated user', async () => {
    const token = jwt.sign({ id: 42, username: 'test_user' }, JWT_SECRET, { expiresIn: '1h' });
    prismaMock.dictionary.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/v1/dictionary?dictionaryId=10')
      .set('Authorization', `Bearer ${token}`);

    expect(res).toMatchObject({ status: 404, body: { error: 'Dictionary not found' } });
    expect(prismaMock.dictionary.findFirst).toHaveBeenCalledWith({ where: { id: 10, userId: 42 } });
    expect(prismaMock.word.findMany).not.toHaveBeenCalled();
  });

  it('should return dictionary correctly', async () => {
    const userId = 42;
    const username = 'test_user';
    const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '1h' });

    const mockDict = {
      id: 10,
      name: 'EN (RU)',
      targetLanguage: 'en',
      baseLanguage: 'ru',
      userId,
      createdAt: new Date(),
    };

    prismaMock.userState.findUnique.mockResolvedValue({
      id: 1,
      userId,
      activeDictionaryId: 10,
      currentWordId: null,
      currentDefinitionId: null,
      showVariants: false,
      showDefinitionTranslation: false,
    } as UserState);

    prismaMock.dictionary.findFirst.mockResolvedValue(mockDict);

    const mockWords = [
      {
        id: 1,
        dictionaryId: 10,
        text: 'apple',
        createdAt: new Date(),
        definitions: [
          {
            id: 1,
            wordId: 1,
            text: 'A fruit',
            createdAt: new Date(),
            translation: {
              id: 1,
              definitionId: 1,
              text: 'Яблоко',
              createdAt: new Date(),
            }
          }
        ]
      }
    ];

    prismaMock.word.findMany.mockResolvedValue(mockWords as Word);

    const res = await request(app)
      .get('/api/v1/dictionary?dictionaryId=10')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.dictionary).toHaveLength(1);
    expect(res.body.dictionary[0].text).toBe('apple');
    expect(res.body.dictionary[0].definitions[0].text).toBe('A fruit');
    expect(res.body.dictionary[0].definitions[0].translation.text).toBe('Яблоко');
    expect(res.body.dictionaryInfo.id).toBe(10);
    expect(res.body.dictionaryInfo.name).toBe('EN (RU)');

    expect(prismaMock.word.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { dictionaryId: 10 }
    }));
  });


});
