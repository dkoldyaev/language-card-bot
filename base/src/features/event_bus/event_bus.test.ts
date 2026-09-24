import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { publishEvent } from './event_bus.service';
import type { MercureEvent } from './event_bus.type';

vi.mock('../../core/env', () => ({
  env: {
    MERCURE_URL: 'http://localhost:9090/.well-known/mercure',
    MERCURE_JWT: 'test_jwt',
    BASE_DOMAIN: 'http://localhost:3000',
  }
}));

const MERCURE_URL = 'http://localhost:9090/.well-known/mercure';
const MERCURE_JWT = 'test_jwt';
const BASE_DOMAIN = 'http://localhost:3000';

describe('event_bus.service', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('ok')
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should publish an event to Mercure successfully', async () => {
    const payload: MercureEvent = {
      version: 'v1',
      type: 'echo',
      message: 'test',
      data: {},
      user: { username: 'test_user' }
    };

    await publishEvent('test_user', payload);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchArgs = vi.mocked(global.fetch).mock.calls[0];
    
    expect(fetchArgs[0]).toBe(MERCURE_URL);
    const options = fetchArgs[1];
    
    expect(options?.method).toBe('POST');
    expect(options?.headers).toHaveProperty('Authorization', `Bearer ${MERCURE_JWT}`);
    expect(options?.headers).toHaveProperty('Content-Type', 'application/x-www-form-urlencoded');

    const bodyStr = options?.body as string;
    const searchParams = new URLSearchParams(bodyStr);
    
    expect(searchParams.get('topic')).toBe(`${BASE_DOMAIN}/v1/users/test_user`);
    expect(JSON.parse(searchParams.get('data') ?? '')).toEqual(payload);
  });

  it('should throw an error if Mercure responds with not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: vi.fn().mockResolvedValue('Unauthorized')
    });

    const payload: MercureEvent = {
      version: 'v1',
      type: 'echo',
      message: 'test',
      data: {},
      user: { username: 'test_user' }
    };

    await expect(publishEvent('test_user', payload)).rejects.toThrow('Failed to publish event to Mercure: Unauthorized');
  });
});
