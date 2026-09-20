import type { Definition, PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type mockDeep, mockReset } from 'vitest-mock-extended';
import app from '../../app';
import { env } from '../../core/env';
import { prisma } from '../../prisma';

vi.mock('../../prisma');

const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('Definition Delete Endpoint', () => {
  const JWT_SECRET = env.JWT_SECRET;

  beforeEach(() => {
    mockReset(prismaMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if no token provided', async () => {
    const res = await request(app).delete('/api/v1/definition_delete/1');
    expect(res.status).toBe(401);
  });

  it('should return 400 if invalid definition ID', async () => {
    const token = jwt.sign({ id: 1, username: 'test' }, JWT_SECRET, { expiresIn: '1h' });
    const res = await request(app)
      .delete('/api/v1/definition_delete/abc')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('should return 404 if definition not found', async () => {
    const token = jwt.sign({ id: 1, username: 'test' }, JWT_SECRET, { expiresIn: '1h' });
    prismaMock.definition.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/v1/definition_delete/1')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(404);
  });

  it('should return 403 if definition belongs to another user', async () => {
    const token = jwt.sign({ id: 1, username: 'test' }, JWT_SECRET, { expiresIn: '1h' });
    
    prismaMock.definition.findUnique.mockResolvedValue({
      id: 1,
      text: 'test definition',
      wordId: 1,
      createdAt: new Date(),
      word: {
        id: 1,
        text: 'test',
        dictionaryId: 2,
        createdAt: new Date(),
        dictionary: {
          id: 2,
          userId: 2,
        }
      }
    } as unknown);

    const res = await request(app)
      .delete('/api/v1/definition_delete/1')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(403);
  });

  it('should delete definition and return 200 on success', async () => {
    const token = jwt.sign({ id: 1, username: 'test' }, JWT_SECRET, { expiresIn: '1h' });
    
    prismaMock.definition.findUnique.mockResolvedValue({
      id: 1,
      text: 'test definition',
      wordId: 1,
      createdAt: new Date(),
      word: {
        id: 1,
        text: 'test',
        dictionaryId: 1,
        createdAt: new Date(),
        dictionary: {
          id: 1,
          userId: 1,
        }
      }
    } as unknown);

    prismaMock.definition.delete.mockResolvedValue({
      id: 1,
      text: 'test definition',
      wordId: 1,
      createdAt: new Date(),
    } as Definition);

    const res = await request(app)
      .delete('/api/v1/definition_delete/1')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Definition deleted successfully');

    expect(prismaMock.definition.delete).toHaveBeenCalledWith({
      where: { id: 1 }
    });
  });
});
