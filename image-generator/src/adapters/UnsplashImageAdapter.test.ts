import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UnsplashImageAdapter } from './UnsplashImageAdapter';

describe('UnsplashImageAdapter', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches photos from Unsplash API with Client-ID header and returns regular URL', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            urls: {
              regular: 'https://images.unsplash.com/photo-test-regular',
              small: 'https://images.unsplash.com/photo-test-small',
            },
          },
        ],
      }),
    } as unknown as Response);

    const adapter = new UnsplashImageAdapter();
    const result = await adapter.generate([['car part', 'air', 'filter']]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual(['https://images.unsplash.com/photo-test-regular']);
  });

  it('returns empty string if Unsplash returns no results without fallback', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    } as unknown as Response);

    const adapter = new UnsplashImageAdapter();
    const result = await adapter.generate([['nonexistentkeyword123']]);

    expect(result).toEqual(['']);
  });

  it('returns empty string without querying API if keywords are empty', async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;

    const adapter = new UnsplashImageAdapter();
    const result = await adapter.generate([['   ']]);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result).toEqual(['']);
  });

  it('throws an error if Unsplash API returns non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    } as unknown as Response);

    const adapter = new UnsplashImageAdapter();
    await expect(adapter.generate([['cat']])).rejects.toThrow('Unsplash API error (401)');
  });
});
