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

  it('returns placeholder URL if Unsplash returns no results', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    } as unknown as Response);

    const adapter = new UnsplashImageAdapter();
    const result = await adapter.generate([['nonexistentkeyword123']]);

    expect(result).toHaveLength(1);
    expect(result[0]).toContain('https://mockimage.tw/photo/640x480/');
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
