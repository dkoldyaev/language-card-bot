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
                  mime: 'image/jpeg',
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

  it('skips audio/video files and returns the first valid image', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        query: {
          pages: {
            '101': {
              imageinfo: [
                {
                  url: 'https://upload.wikimedia.org/wikipedia/commons/audio.ogg',
                  mime: 'audio/ogg',
                },
              ],
            },
            '102': {
              imageinfo: [
                {
                  url: 'https://upload.wikimedia.org/wikipedia/commons/video.mp4',
                  mime: 'video/mp4',
                },
              ],
            },
            '103': {
              imageinfo: [
                {
                  url: 'https://upload.wikimedia.org/wikipedia/commons/image.jpg',
                  thumburl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/image.jpg',
                  mime: 'image/jpeg',
                },
              ],
            },
          },
        },
      }),
    } as unknown as Response);

    const adapter = new WikimediaImageAdapter();
    const result = await adapter.generate([['pronunciation', 'sound']]);

    expect(result).toEqual(['https://thumb.wikimedia.org/wikipedia/commons/thumb/image.jpg']);
  });

  it('returns empty string if no valid images are found', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        query: {
          pages: {
            '101': {
              imageinfo: [
                {
                  url: 'https://upload.wikimedia.org/wikipedia/commons/audio.ogg',
                  mime: 'audio/ogg',
                },
              ],
            },
          },
        },
      }),
    } as unknown as Response);

    const adapter = new WikimediaImageAdapter();
    const result = await adapter.generate([['pronunciation']]);

    expect(result).toEqual(['']);
  });

  it('returns empty string if Wikimedia Commons returns no pages without fallback', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ query: { pages: {} } }),
    } as unknown as Response);

    const adapter = new WikimediaImageAdapter();
    const result = await adapter.generate([['qwertyunknown']]);

    expect(result).toEqual(['']);
  });

  it('returns empty string without querying API if keywords are empty', async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;

    const adapter = new WikimediaImageAdapter();
    const result = await adapter.generate([['   ']]);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result).toEqual(['']);
  });
});
