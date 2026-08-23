import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import jwt from 'jsonwebtoken';
import { publishEvent } from '../event_bus/event_bus.service';

vi.mock('../event_bus/event_bus.service', () => ({
  publishEvent: vi.fn()
}));

describe('Echo Endpoint', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
  const MERCURE_URL = process.env.MERCURE_URL || 'http://localhost:9090/.well-known/mercure';

  beforeEach(() => {
    // Override env variables for tests
    process.env.MERCURE_URL = MERCURE_URL;
    process.env.MERCURE_JWT = 'test_mercure_jwt';
    process.env.JWT_SECRET = JWT_SECRET;

    vi.mocked(publishEvent).mockResolvedValue();
  });

  afterEach(() => {
    vi.clearAllMocks();
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

    // Verify event bus push
    expect(publishEvent).toHaveBeenCalledTimes(1);
    expect(publishEvent).toHaveBeenCalledWith('testuser', expect.objectContaining({
      version: 'v1',
      type: 'echo',
      message: 'Echo successful',
      data: payload,
      user: { username: 'testuser' }
    }));
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

    // Verify event bus push was called twice
    expect(publishEvent).toHaveBeenCalledTimes(2);
    
    // Check user1's topic and data
    expect(publishEvent).toHaveBeenCalledWith('user1', expect.objectContaining({
      data: payload1,
      user: { username: 'user1' }
    }));

    // Check user2's topic and data
    expect(publishEvent).toHaveBeenCalledWith('user2', expect.objectContaining({
      data: payload2,
      user: { username: 'user2' }
    }));
  });
});
