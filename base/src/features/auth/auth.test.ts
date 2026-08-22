import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { prisma } from '../../prisma';

describe('Auth Endpoints', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany({});
  });

  afterEach(async () => {
    await prisma.user.deleteMany({});
  });

  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: 'testuser' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('username', 'testuser');
    expect(res.body.user).toHaveProperty('id');

    const userInDb = await prisma.user.findUnique({
      where: { username: 'testuser' },
      include: { state: true }
    });

    expect(userInDb).toBeDefined();
    expect(userInDb?.state).toBeDefined();
    expect(userInDb?.state).not.toBeNull();
    expect(userInDb?.state?.mode).toBe('DEFAULT');
  });

  it('should login an existing user', async () => {
    await prisma.user.create({
      data: {
        username: 'existinguser',
        state: {
          create: { mode: 'DEFAULT' }
        }
      }
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'existinguser' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('username', 'existinguser');
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
