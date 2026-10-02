import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PexelsImageAdapter } from './PexelsImageAdapter';

describe('PexelsImageAdapter', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches photos from Pexels API and returns medium image URL', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        photos: [
          {
            src: {
              medium: 'https://images.pexels.com/photos/123/medium.jpg',
              large: 'https://images.pexels.com/photos/123/large.jpg',
            },
          },
        ],
      }),
    } as unknown as Response);

    const adapter = new PexelsImageAdapter();
    const result = await adapter.generate([['forest', 'trees']]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual([['https://images.pexels.com/photos/123/medium.jpg']]);
  });

  it('returns empty string if Pexels returns empty photos without fallback', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ photos: [] }),
    } as unknown as Response);

    const adapter = new PexelsImageAdapter();
    const result = await adapter.generate([['randomunknownxyz']]);

    expect(result).toEqual([[]]);
  });

  it('returns empty string without querying API if keywords are empty', async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;

    const adapter = new PexelsImageAdapter();
    const result = await adapter.generate([['   ', '']]);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result).toEqual([[]]);
  });

  it('throws an error if Pexels API returns non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    } as unknown as Response);

    const adapter = new PexelsImageAdapter();
    await expect(adapter.generate([['ocean']])).rejects.toThrow('Pexels API error (403)');
  });
});
