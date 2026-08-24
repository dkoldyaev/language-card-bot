import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../prisma';
import { clearDatabase } from './helpers';

describe('Auth E2E', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should successfully register and login', async () => {
    const newUser = 'auth_e2e_user';
    
    // Register
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: newUser });

    expect(registerRes).toMatchObject({
      status: 200,
      body: {
        user: {
          id: expect.any(Number),
          username: newUser,
        },
        token: expect.any(String),
      }
    });

    // Login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: newUser });

    expect(loginRes).toMatchObject({
      status: 200,
      body: {
        user: {
          username: newUser,
        },
        token: expect.any(String),
      },
    });
  });
});
