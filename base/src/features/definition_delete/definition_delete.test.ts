import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';

vi.mock('../../prisma');

const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('Definition Delete Endpoint', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

  beforeEach(() => {
    process.env.JWT_SECRET = JWT_SECRET;
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
        userId: 2, // belongs to user 2
        createdAt: new Date(),
      }
    } as any);

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
        userId: 1, // belongs to user 1
        createdAt: new Date(),
      }
    } as any);

    prismaMock.definition.delete.mockResolvedValue({
      id: 1,
      text: 'test definition',
      wordId: 1,
      createdAt: new Date(),
    } as any);

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
