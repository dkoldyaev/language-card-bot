import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WikimediaImageAdapter } from './WikimediaImageAdapter';

describe('WikimediaImageAdapter', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches images from Wikimedia Commons and returns thumburl', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        query: {
          pages: {
            '12345': {
              imageinfo: [
                {
                  thumburl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/test.jpg',
                  url: 'https://upload.wikimedia.org/wikipedia/commons/test.jpg',
                },
              ],
            },
          },
        },
      }),
    } as unknown as Response);

    const adapter = new WikimediaImageAdapter();
    const result = await adapter.generate([['cat', 'snow']]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual(['https://thumb.wikimedia.org/wikipedia/commons/thumb/test.jpg']);
  });

  it('returns placeholder URL if Wikimedia Commons returns no pages', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ query: { pages: {} } }),
    } as unknown as Response);

    const adapter = new WikimediaImageAdapter();
    const result = await adapter.generate([['qwertyunknown']]);

    expect(result).toHaveLength(1);
    expect(result[0]).toContain('https://mockimage.tw/photo/640x480/');
  });
});
