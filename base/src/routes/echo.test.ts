import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../app';
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
    expect(res.body.version).toBe('v1');
    expect(res.body.message).toBe('Echo successful');
    expect(res.body.data).toEqual(payload);
    expect(res.body.user).toHaveProperty('username', 'testuser');

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
    
    expect(searchParams.get('topic')).toBe('http://localhost/v1/echo');
    
    const mercureData = JSON.parse(searchParams.get('data') || '{}');
    expect(mercureData.version).toBe('v1');
    expect(mercureData.message).toBe('Echo successful');
    expect(mercureData.data).toEqual(payload);
    expect(mercureData.user).toHaveProperty('username', 'testuser');
  });
});
