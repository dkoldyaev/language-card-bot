import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

describe('State Endpoints', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany({});
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('ok')
    });
  });

  afterEach(async () => {
    await prisma.user.deleteMany({});
    vi.restoreAllMocks();
  });

  it('should sync state to Mercure', async () => {
    const user = await prisma.user.create({
      data: {
        username: 'stateuser',
        state: {
          create: { mode: 'DEFAULT' }
        }
      }
    });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });

    const res = await request(app)
      .post('/api/v1/state/sync')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('State synced to Mercure');
    expect(res.body.state).toHaveProperty('mode', 'DEFAULT');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchArgs = vi.mocked(global.fetch).mock.calls[0];
    const bodyStr = fetchArgs[1]?.body as string;
    const searchParams = new URLSearchParams(bodyStr);
    
    expect(searchParams.get('topic')).toBe('http://localhost/v1/users/stateuser/state');
    const mercureData = JSON.parse(searchParams.get('data') || '{}');
    expect(mercureData.mode).toBe('DEFAULT');
    expect(mercureData.type).toBe('state_sync');
  });
});
