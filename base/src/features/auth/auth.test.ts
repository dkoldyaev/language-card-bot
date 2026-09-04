import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { prisma } from '../../prisma';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';

vi.mock('../../prisma');
vi.mock('google-auth-library');

const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;
const mockVerifyIdToken = vi.fn();

// @ts-ignore
OAuth2Client.prototype.verifyIdToken = mockVerifyIdToken;

describe('Auth Endpoints', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

  beforeEach(() => {
    mockReset(prismaMock);
    mockVerifyIdToken.mockReset();
  });

  it('should register a new user via Google successfully', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: 'test@example.com',
        name: 'Test User',
        picture: 'http://example.com/pic.jpg',
        sub: 'google_123',
      }),
    });

    prismaMock.account.findUnique.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue(null);
    
    prismaMock.user.create.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      picture: 'http://example.com/pic.jpg',
      createdAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'mock_google_token' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('email', 'test@example.com');
    expect(res.body.user).toHaveProperty('id', 1);
    expect(res.body.user).toHaveProperty('isNewUser', true);

    expect(prismaMock.user.create).toHaveBeenCalled();
  });

  it('should login an existing user via Google', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: 'existing@example.com',
        name: 'Existing User',
        picture: 'http://example.com/pic2.jpg',
        sub: 'google_456',
      }),
    });

    prismaMock.account.findUnique.mockResolvedValue({
      id: 1,
      userId: 2,
      provider: 'google',
      providerAccountId: 'google_456',
      user: {
        id: 2,
        email: 'existing@example.com',
        name: 'Existing User',
        picture: 'http://example.com/pic2.jpg',
        createdAt: new Date(),
      }
    } as any);

    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'mock_google_token_2' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('email', 'existing@example.com');
    expect(res.body.user).toHaveProperty('isNewUser', false);
  });

  it('should get current user profile for /me', async () => {
    const userId = 42;
    const email = 'test_me@example.com';
    const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '1h' });

    prismaMock.user.findUnique.mockResolvedValue({
      id: userId,
      email,
      name: 'Test Me',
      picture: null,
      createdAt: new Date(),
    } as any);

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      user: {
        id: userId,
        email
      }
    });
  });
});
