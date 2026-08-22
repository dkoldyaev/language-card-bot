import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';

describe('State Endpoint', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
  const MERCURE_URL = process.env.MERCURE_URL || 'http://localhost:9090/.well-known/mercure';

  beforeEach(async () => {
    process.env.MERCURE_URL = MERCURE_URL;
    process.env.MERCURE_JWT = 'test_mercure_jwt';
    process.env.JWT_SECRET = JWT_SECRET;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('ok')
    });

    await prisma.user.deleteMany({});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await prisma.user.deleteMany({});
  });

  it('should return 401 if no token provided', async () => {
    const res = await request(app).post('/api/v1/state/sync');
    expect(res.status).toBe(401);
  });

  it('should sync state to Mercure and return 200', async () => {
    // Register user with state
    const user = await prisma.user.create({
      data: {
        username: 'test_sync_user',
        state: {
          create: {
            mode: 'DEFAULT'
          }
        }
      }
    });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });

    const res = await request(app)
      .post('/api/v1/state/sync')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('State synced to Mercure');
    expect(res.body.state.mode).toBe('DEFAULT');

    // Verify Mercure push
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchArgs = vi.mocked(global.fetch).mock.calls[0];
    const options = fetchArgs[1];
    
    expect(fetchArgs[0]).toBe(MERCURE_URL);
    expect(options?.headers).toHaveProperty('Authorization', 'Bearer test_mercure_jwt');
    
    const bodyStr = options?.body as string;
    const searchParams = new URLSearchParams(bodyStr);
    
    expect(searchParams.get('topic')).toBe('http://localhost/v1/users/test_sync_user/state');
    const mercureData = JSON.parse(searchParams.get('data') || '{}');
    expect(mercureData.type).toBe('state_sync');
    expect(mercureData.mode).toBe('DEFAULT');
  });
});
