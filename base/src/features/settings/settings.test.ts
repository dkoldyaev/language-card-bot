import type { PrismaClient, } from '@prisma/client';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type mockDeep, mockReset } from 'vitest-mock-extended';
import app from '../../app';
import { env } from '../../core/env';
import { prisma } from '../../prisma';
import { publishEvent } from '../event_bus/event_bus.service';

vi.mock('../../prisma');
vi.mock('../event_bus/event_bus.service', () => ({
  publishEvent: vi.fn()
}));

const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('Settings Endpoint', () => {
  const JWT_SECRET = env.JWT_SECRET;
  const MERCURE_URL = 'http://localhost:9090/.well-known/mercure';

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

  it('should return guest policy without auth', async () => {
    const res = await request(app).get('/api/v1/settings/guest-policy');
    expect(res.status).toBe(200);
    expect(typeof res.body.allowGuestAi).toBe('boolean');
    expect(typeof res.body.dailyLimit).toBe('number');
  });
});
