import type { Definition, PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type mockDeep, mockReset } from 'vitest-mock-extended';
import app from '../../app';
import { env } from '../../core/env';
import { prisma } from '../../prisma';
import { enqueueFetchTranslations } from '../add_word/add_word.queue';

vi.mock('../../prisma');
vi.mock('../add_word/add_word.queue', () => ({
  enqueueFetchTranslations: vi.fn().mockResolvedValue(undefined)
}));

const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('PUT /api/v1/definition_edit/:id', () => {
  const JWT_SECRET = env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    mockReset(prismaMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if no token provided', async () => {
    const res = await request(app).put('/api/v1/definition_edit/1').send({ text: 'test' });
    expect(res.status).toBe(401);
  });

  it('should return 400 if validation fails', async () => {
    const token = jwt.sign({ id: 1, username: 'testuser' }, JWT_SECRET, { expiresIn: '1h' });
    const res = await request(app)
      .put('/api/v1/definition_edit/1')
      .set('Authorization', `Bearer ${token}`)
      .send({}); // Missing text

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request body');
  });

  it('should return 404 if definition does not exist', async () => {
    const token = jwt.sign({ id: 1, username: 'testuser' }, JWT_SECRET, { expiresIn: '1h' });
    prismaMock.definition.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .put('/api/v1/definition_edit/99')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'test definition' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Definition not found');
  });

  it('should return 403 if definition belongs to another user', async () => {
    const token = jwt.sign({ id: 1, username: 'testuser' }, JWT_SECRET, { expiresIn: '1h' });
    prismaMock.definition.findUnique.mockResolvedValue({
      id: 1,
      wordId: 1,
      text: 'old text',
      createdAt: new Date(),
      word: {
        id: 1,
        text: 'word',
        dictionaryId: 99,
        createdAt: new Date(),
        definitions: [],
        dictionary: {
          id: 99,
          userId: 99,
        }
      }
    } as unknown);

    const res = await request(app)
      .put('/api/v1/definition_edit/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'test definition' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('should edit definition and enqueue translation fetch successfully', async () => {
    const token = jwt.sign({ id: 1, username: 'testuser' }, JWT_SECRET, { expiresIn: '1h' });
    
    const mockWord = {
      id: 10,
      text: 'word',
      dictionaryId: 1,
      createdAt: new Date(),
      definitions: [
        { id: 1, text: 'old text', wordId: 10, createdAt: new Date() },
        { id: 2, text: 'another text', wordId: 10, createdAt: new Date() }
      ],
      dictionary: {
        id: 1,
        userId: 1,
        targetLanguage: 'en',
        baseLanguage: 'ru',
      }
    };

    const mockDefinition = {
      id: 1,
      wordId: 10,
      text: 'old text',
      createdAt: new Date(),
      word: mockWord
    };

    const updatedDefinition = {
      id: 1,
      wordId: 10,
      text: 'new text',
      createdAt: new Date()
    };

    prismaMock.definition.findUnique.mockResolvedValue(mockDefinition as Definition);
    prismaMock.definition.update.mockResolvedValue(updatedDefinition as Definition);

    const res = await request(app)
      .put('/api/v1/definition_edit/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'new text' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Definition edited successfully');

    expect(prismaMock.definition.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { text: 'new text' }
    });

    expect(enqueueFetchTranslations).toHaveBeenCalledWith(
      [{ id: 1, text: 'new text' }],
      1,
      'testuser',
      10,
      'word',
      'en',
      'ru'
    );
  });
});
