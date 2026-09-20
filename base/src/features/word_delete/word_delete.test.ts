import type { PrismaClient, Word } from '@prisma/client';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type mockDeep, mockReset } from 'vitest-mock-extended';
import app from '../../app';
import { prisma } from '../../prisma';
import { env } from '../../core/env';

vi.mock('../../prisma');

const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('Word Delete Endpoint', () => {
  const JWT_SECRET = env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    mockReset(prismaMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if no token provided', async () => {
    const res = await request(app).delete('/api/v1/word_delete/1');
    expect(res.status).toBe(401);
  });

  it('should return 400 if wordId is invalid', async () => {
    const token = jwt.sign({ id: 1, username: 'testuser' }, JWT_SECRET, { expiresIn: '1h' });
    const res = await request(app)
      .delete('/api/v1/word_delete/invalid')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid wordId');
  });

  it('should return 404 if word does not exist', async () => {
    const token = jwt.sign({ id: 1, username: 'testuser' }, JWT_SECRET, { expiresIn: '1h' });

    prismaMock.word.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/v1/word_delete/99')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Word not found');
  });

  it('should return 403 if word belongs to another user', async () => {
    const token = jwt.sign({ id: 1, username: 'testuser' }, JWT_SECRET, { expiresIn: '1h' });

    prismaMock.word.findUnique.mockResolvedValue({
      id: 99,
      text: 'hello',
      dictionaryId: 2,
      createdAt: new Date(),
    });

    const res = await request(app)
      .delete('/api/v1/word_delete/99')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('should delete word if it belongs to user', async () => {
    const token = jwt.sign({ id: 1, username: 'testuser' }, JWT_SECRET, { expiresIn: '1h' });

    prismaMock.word.findUnique.mockResolvedValue({
      id: 99,
      text: 'hello',
      dictionaryId: 1,
      createdAt: new Date(),
    });

    prismaMock.word.delete.mockResolvedValue({
      id: 99,
      text: 'hello',
      dictionaryId: 1,
      createdAt: new Date(),
    } as Word);

    const res = await request(app)
      .delete('/api/v1/word_delete/99')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Word deleted successfully');

    expect(prismaMock.word.delete).toHaveBeenCalledWith({
      where: { id: 99 }
    });
  });
});
