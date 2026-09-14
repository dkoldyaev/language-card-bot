import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { enqueueFetchTranslation } from '../add_word/add_word.queue';

vi.mock('../../prisma');
vi.mock('../add_word/add_word.queue', () => ({
  enqueueFetchTranslation: vi.fn().mockResolvedValue(undefined)
}));

const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('POST /api/v1/definition_add', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

  beforeEach(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    mockReset(prismaMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if no token provided', async () => {
    const res = await request(app).post('/api/v1/definition_add').send({ wordId: 1, text: 'test' });
    expect(res.status).toBe(401);
  });

  it('should return 400 if validation fails', async () => {
    const token = jwt.sign({ id: 1, username: 'testuser' }, JWT_SECRET, { expiresIn: '1h' });
    const res = await request(app)
      .post('/api/v1/definition_add')
      .set('Authorization', `Bearer ${token}`)
      .send({ wordId: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request body');
  });

  it('should return 404 if word does not exist', async () => {
    const token = jwt.sign({ id: 1, username: 'testuser' }, JWT_SECRET, { expiresIn: '1h' });
    prismaMock.word.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/definition_add')
      .set('Authorization', `Bearer ${token}`)
      .send({ wordId: 99, text: 'test definition' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Word not found');
  });

  it('should add definition and enqueue translation fetch successfully', async () => {
    const token = jwt.sign({ id: 1, username: 'testuser' }, JWT_SECRET, { expiresIn: '1h' });
    const mockWord = {
      id: 1,
      text: 'test',
      dictionaryId: 1,
      createdAt: new Date(),
      definitions: [{ id: 1, text: 'old def', wordId: 1, createdAt: new Date() }],
      dictionary: {
        id: 1,
        userId: 1,
        name: 'EN (RU)',
        targetLanguage: 'en',
        baseLanguage: 'ru',
        createdAt: new Date(),
      }
    };

    const newDef = {
      id: 2,
      text: 'new test definition',
      wordId: 1,
      createdAt: new Date()
    };

    prismaMock.word.findFirst.mockResolvedValue(mockWord as any);
    prismaMock.definition.create.mockResolvedValue(newDef as any);

    const res = await request(app)
      .post('/api/v1/definition_add')
      .set('Authorization', `Bearer ${token}`)
      .send({ wordId: 1, text: 'new test definition' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Definition added successfully');
    expect(res.body.definitionId).toBe(2);

    expect(prismaMock.definition.create).toHaveBeenCalledWith({
      data: {
        wordId: 1,
        text: 'new test definition'
      }
    });

    expect(enqueueFetchTranslation).toHaveBeenCalledWith(
      2,
      'new test definition',
      1,
      'testuser',
      1,
      'test',
      2,
      'en',
      'ru'
    );
  });
});
