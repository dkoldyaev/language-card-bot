import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';

vi.mock('../../prisma');
const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('Dictionary Fetch Endpoint', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

  beforeEach(() => {
    mockReset(prismaMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if no token is provided', async () => {
    const res = await request(app).get('/api/v1/dictionary');
    expect(res.status).toBe(401);
  });

  it('should return dictionary correctly', async () => {
    const userId = 42;
    const username = 'test_user';
    const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '1h' });

    const mockWords = [
      {
        id: 1,
        userId,
        text: 'apple',
        createdAt: new Date(),
        updatedAt: new Date(),
        definitions: [
          {
            id: 1,
            wordId: 1,
            text: 'A fruit',
            createdAt: new Date(),
            updatedAt: new Date(),
            translation: {
              id: 1,
              definitionId: 1,
              text: 'Яблоко',
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          }
        ]
      }
    ];

    prismaMock.word.findMany.mockResolvedValue(mockWords);

    const res = await request(app)
      .get('/api/v1/dictionary')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.dictionary).toHaveLength(1);
    expect(res.body.dictionary[0].text).toBe('apple');
    expect(res.body.dictionary[0].definitions[0].text).toBe('A fruit');
    expect(res.body.dictionary[0].definitions[0].translation.text).toBe('Яблоко');

    expect(prismaMock.word.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId }
    }));
  });
});
