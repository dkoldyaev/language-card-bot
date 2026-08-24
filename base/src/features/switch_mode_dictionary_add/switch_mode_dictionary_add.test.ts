import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { publishEvent } from '../event_bus/event_bus.service';
import { UserMode } from '@prisma/client';

vi.mock('../../prisma');
vi.mock('../event_bus/event_bus.service', () => ({
  publishEvent: vi.fn()
}));

const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('Dictionary Add Endpoint', () => {
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
    const res = await request(app).post('/api/v1/switch_mode_dictionary_add/');
    expect(res.status).toBe(401);
  });

  it('should switch user mode to DICTIONARY_ADD and sync state to Mercure', async () => {
    // Arrange
    const userId = 10;
    const username = 'test_dict_add_user';
    const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '1h' });

    prismaMock.userState.update.mockResolvedValue({
      id: 1,
      userId,
      mode: UserMode.DICTIONARY_ADD,
      currentWordId: null
    });

    // Act
    const res = await request(app)
      .post('/api/v1/switch_mode_dictionary_add/')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Switched to dictionary add view');

    // Verify DB update
    expect(prismaMock.userState.update).toHaveBeenCalledWith({
      where: { userId },
      data: { mode: UserMode.DICTIONARY_ADD }
    });

    // Verify event bus push
    expect(publishEvent).toHaveBeenCalledTimes(1);
    expect(publishEvent).toHaveBeenCalledWith(username, {
      version: 'v1',
      type: 'state_sync',
      mode: UserMode.DICTIONARY_ADD,
      currentWordId: null
    });
  });
});
