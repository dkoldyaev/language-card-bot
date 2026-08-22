import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';

vi.mock('../../prisma');

const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('Dictionary View Endpoint', () => {
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

    mockReset(prismaMock);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  it('should return 401 if no token provided', async () => {
    const res = await request(app).post('/api/v1/dictionary_view/switch_to_dictionary');
    expect(res.status).toBe(401);
  });

  it('should switch user mode to DICTIONARY_VIEW and sync state to Mercure', async () => {
    // Arrange
    const userId = 10;
    const username = 'test_dict_user';
    const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '1h' });

    prismaMock.userState.update.mockResolvedValue({
      id: 1,
      userId,
      mode: 'DICTIONARY_VIEW'
    });

    // Act
    const res = await request(app)
      .post('/api/v1/dictionary_view/switch_to_dictionary')
      .set('Authorization', `Bearer ${token}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Switched to dictionary view');

    // Verify DB update
    expect(prismaMock.userState.update).toHaveBeenCalledWith({
      where: { userId },
      data: { mode: 'DICTIONARY_VIEW' }
    });

    // Verify Mercure push
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchArgs = vi.mocked(global.fetch).mock.calls[0];
    const options = fetchArgs[1];
    
    expect(fetchArgs[0]).toBe(MERCURE_URL);
    expect(options?.headers).toHaveProperty('Authorization', 'Bearer test_mercure_jwt');
    
    const bodyStr = options?.body as string;
    const searchParams = new URLSearchParams(bodyStr);
    
    expect(searchParams.get('topic')).toBe(`http://localhost/v1/users/${username}/state`);
    const mercureData = JSON.parse(searchParams.get('data') || '{}');
    expect(mercureData.type).toBe('state_sync');
    expect(mercureData.mode).toBe('DICTIONARY_VIEW');
  });
});
