import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockVerifyIdToken } = vi.hoisted(() => {
  return { mockVerifyIdToken: vi.fn() };
});

vi.mock('google-auth-library', () => {
  return {
    OAuth2Client: class {
      verifyIdToken = mockVerifyIdToken;
    }
  };
});

vi.mock('../../core/env', () => {
  const jwtSecret = env.JWT_SECRET;
  return {
    env: {
      DATABASE_URL: 'postgresql://test@localhost:5432/test',
      JWT_SECRET: jwtSecret,
      PORT: '3001',
      MERCURE_URL: 'http://localhost:9090/.well-known/mercure',
      MERCURE_JWT: 'test_jwt',
      MERCURE_JWT_KEY: 'test_key',
      TRANSLATOR_API_URL: 'http://localhost:3002/api/v1/translate',
      DEFINER_API_URL: 'http://localhost:3003/api/v1/define',
      DEFINER_APP_TYPE: 'freedictionary',
      TRANSLATOR_APP_TYPE: 'laratranslate',
      BASE_DOMAIN: 'http://localhost',
      REDIS_URL: 'redis://localhost:6379',
      CORS_ORIGIN: 'http://localhost:5173',
      GOOGLE_CLIENT_ID: 'mock_google_client_id',
      ENABLE_TEST_AUTH: 'true',
    }
  };
});

import type { Account, PrismaClient, User } from '@prisma/client';
import { type mockDeep, mockReset } from 'vitest-mock-extended';
import app from '../../app';
import { env } from '../../core/env';
import { prisma } from '../../prisma';

vi.mock('../../prisma');

const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('Auth Endpoints', () => {
  const JWT_SECRET = env.JWT_SECRET;

  beforeEach(() => {
    mockReset(prismaMock);
    mockVerifyIdToken.mockReset();
  });

  describe('Google OAuth', () => {
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
      } as User);

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
      });

      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ credential: 'mock_google_token_2' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('email', 'existing@example.com');
      expect(res.body.user).toHaveProperty('isNewUser', false);
    });
  });

  describe('Test Username Auth', () => {
    it('should register a new user with username successfully', async () => {
      prismaMock.account.findUnique.mockResolvedValue(null);
      prismaMock.user.findFirst.mockResolvedValue(null);

      prismaMock.user.create.mockResolvedValue({
        id: 10,
        email: 'tester@test.local',
        name: 'tester',
        picture: null,
        createdAt: new Date(),
      } as User);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ username: 'tester' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('mercureToken');
      expect(res.body.user).toMatchObject({
        id: 10,
        username: 'tester',
        email: 'tester@test.local',
        name: 'tester',
        isNewUser: true,
      });
      expect(prismaMock.user.create).toHaveBeenCalled();
    });

    it('should return 400 on register if username already exists', async () => {
      prismaMock.account.findUnique.mockResolvedValue({
        id: 1,
        userId: 10,
        provider: 'test-username',
        providerAccountId: 'tester',
      } as Account);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ username: 'tester' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Username already exists');
    });

    it('should login an existing test user by username', async () => {
      prismaMock.account.findUnique.mockResolvedValue({
        id: 1,
        userId: 10,
        provider: 'test-username',
        providerAccountId: 'tester',
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'tester' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toMatchObject({
        id: 10,
        username: 'tester',
        email: 'tester@test.local',
      });
    });

    it('should return 401 on login if user not found', async () => {
      prismaMock.account.findUnique.mockResolvedValue(null);
      prismaMock.user.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'unknown' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'User not found');
    });
  });

  describe('GET /me', () => {
    it('should get current user profile for /me', async () => {
      const userId = 42;
      const email = 'test_me@example.com';
      const token = jwt.sign({ id: userId, email, username: 'test_me' }, JWT_SECRET, { expiresIn: '1h' });

      prismaMock.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        name: 'Test Me',
        picture: null,
        createdAt: new Date(),
      } as User);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        user: {
          id: userId,
          email,
          username: 'test_me',
        }
      });
    });
  });
});
