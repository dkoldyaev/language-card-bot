import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import jwt from 'jsonwebtoken';

describe('Echo Endpoint', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
  const MERCURE_URL = process.env.MERCURE_URL || 'http://localhost:9090/.well-known/mercure';

  beforeEach(() => {
    // Override env variables for tests
    process.env.MERCURE_URL = MERCURE_URL;
    process.env.MERCURE_JWT = 'test_mercure_jwt';
    process.env.JWT_SECRET = JWT_SECRET;

    // Mock global fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('ok')
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return 401 if no token is provided', async () => {
    const res = await request(app)
      .post('/api/v1/echo')
      .send({ message: 'Hello' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized: No token provided' });
  });

  it('should return 200 and publish to Mercure if token is valid', async () => {
    // Generate token
    const token = jwt.sign({ username: 'testuser' }, JWT_SECRET, { expiresIn: '1h' });

    const payload = { message: 'Hello Mercure!' };

    const res = await request(app)
      .post('/api/v1/echo')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Echo successful');
    expect(res.body.data).toEqual(payload);

    // Verify Mercure fetch was called
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchArgs = vi.mocked(global.fetch).mock.calls[0];
    
    // Check URL
    expect(fetchArgs[0]).toBe(MERCURE_URL);
    
    // Check fetch options
    const options = fetchArgs[1];
    expect(options).toBeDefined();
    expect(options?.method).toBe('POST');
    expect(options?.headers).toHaveProperty('Authorization', 'Bearer test_mercure_jwt');
    expect(options?.headers).toHaveProperty('Content-Type', 'application/x-www-form-urlencoded');

    // Check body content
    const bodyStr = options?.body as string;
    const searchParams = new URLSearchParams(bodyStr);
    
    expect(searchParams.get('topic')).toBe(`${process.env.BASE_DOMAIN}/v1/users/testuser`);
    
    const mercureData = JSON.parse(searchParams.get('data') || '{}');
    expect(mercureData.version).toBe('v1');
    expect(mercureData.message).toBe('Echo successful');
    expect(mercureData.data).toEqual(payload);
    expect(mercureData.user).toHaveProperty('username', 'testuser');
  });

  it('should isolate Mercure topics for different users', async () => {
    // Generate tokens for two different users
    const token1 = jwt.sign({ username: 'user1' }, JWT_SECRET, { expiresIn: '1h' });
    const token2 = jwt.sign({ username: 'user2' }, JWT_SECRET, { expiresIn: '1h' });

    const payload1 = { message: 'Hello user1' };
    const payload2 = { message: 'Hello user2' };

    // Request from user 1
    await request(app)
      .post('/api/v1/echo')
      .set('Authorization', `Bearer ${token1}`)
      .send(payload1);

    // Request from user 2
    await request(app)
      .post('/api/v1/echo')
      .set('Authorization', `Bearer ${token2}`)
      .send(payload2);

    // Verify Mercure fetch was called twice
    expect(global.fetch).toHaveBeenCalledTimes(2);
    
    const fetchArgs1 = vi.mocked(global.fetch).mock.calls[0];
    const fetchArgs2 = vi.mocked(global.fetch).mock.calls[1];
    
    // Check user1's topic and data
    const bodyStr1 = fetchArgs1[1]?.body as string;
    const searchParams1 = new URLSearchParams(bodyStr1);
    expect(searchParams1.get('topic')).toBe(`${process.env.BASE_DOMAIN}/v1/users/user1`);
    const mercureData1 = JSON.parse(searchParams1.get('data') || '{}');
    expect(mercureData1.data).toEqual(payload1);
    expect(mercureData1.user.username).toBe('user1');

    // Check user2's topic and data
    const bodyStr2 = fetchArgs2[1]?.body as string;
    const searchParams2 = new URLSearchParams(bodyStr2);
    expect(searchParams2.get('topic')).toBe(`${process.env.BASE_DOMAIN}/v1/users/user2`);
    const mercureData2 = JSON.parse(searchParams2.get('data') || '{}');
    expect(mercureData2.data).toEqual(payload2);
    expect(mercureData2.user.username).toBe('user2');
  });
});
