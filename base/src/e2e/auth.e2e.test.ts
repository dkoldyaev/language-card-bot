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

    expect(registerRes.status).toBe(200);
    expect(registerRes.body.user.username).toBe(newUser);
    expect(registerRes.body).toHaveProperty('token');

    // Login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: newUser });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.username).toBe(newUser);
    expect(loginRes.body).toHaveProperty('token');
  });
});
