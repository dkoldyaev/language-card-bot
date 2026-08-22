import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { prisma } from '../../prisma';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';

vi.mock('../../prisma');

const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('Auth Endpoints', () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  it('should register a new user successfully', async () => {
    // Arrange: User doesn't exist
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 1,
      username: 'testuser',
      createdAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: 'testuser' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('username', 'testuser');
    expect(res.body.user).toHaveProperty('id', 1);

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { username: 'testuser' }
    });
    expect(prismaMock.user.create).toHaveBeenCalled();
  });

  it('should login an existing user', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 2,
      username: 'existinguser',
      createdAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'existinguser' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('username', 'existinguser');
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { username: 'existinguser' }
    });
  });

  it('should return 400 for invalid validation', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: 'ab' }); // less than 3 chars

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Validation failed');
    expect(res.body).toHaveProperty('details');
  });
});
