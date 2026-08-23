import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { publishEvent } from '../event_bus/event_bus.service';

vi.mock('../../prisma');
vi.mock('../event_bus/event_bus.service', () => ({
  publishEvent: vi.fn()
}));

const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('State Endpoint', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
  const MERCURE_URL = process.env.MERCURE_URL || 'http://localhost:9090/.well-known/mercure';

  beforeEach(async () => {
    process.env.MERCURE_URL = MERCURE_URL;
    process.env.MERCURE_JWT = 'test_mercure_jwt';
    process.env.JWT_SECRET = JWT_SECRET;

    vi.mocked(publishEvent).mockResolvedValue();

    mockReset(prismaMock);
  });

  afterEach(async () => {
    vi.clearAllMocks();
  });

  it('should return 401 if no token provided', async () => {
    const res = await request(app).post('/api/v1/state/sync');
    expect(res.status).toBe(401);
  });

  it('should sync state to Mercure and return 200', async () => {
    const userId = 20;
    const username = 'test_sync_user';
    const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '1h' });

    prismaMock.userState.findUnique.mockResolvedValue({
      id: 1,
      userId,
      mode: 'DEFAULT'
    });

    const res = await request(app)
      .post('/api/v1/state/sync')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('State synced to Mercure');
    expect(res.body.state.mode).toBe('DEFAULT');

    expect(prismaMock.userState.findUnique).toHaveBeenCalledWith({
      where: { userId }
    });

    // Verify event bus push
    expect(publishEvent).toHaveBeenCalledTimes(1);
    expect(publishEvent).toHaveBeenCalledWith(username, expect.objectContaining({
      type: 'state_sync',
      mode: 'DEFAULT'
    }));
  });
});
