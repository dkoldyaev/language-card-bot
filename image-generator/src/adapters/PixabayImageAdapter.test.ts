import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PixabayImageAdapter } from './PixabayImageAdapter';

describe('PixabayImageAdapter', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches photos from Pixabay API and returns webformatURL', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        hits: [
          {
            webformatURL: 'https://pixabay.com/get/test-webformat.jpg',
            largeImageURL: 'https://pixabay.com/get/test-large.jpg',
          },
        ],
      }),
    } as unknown as Response);

    const adapter = new PixabayImageAdapter();
    const result = await adapter.generate([['mountain', 'snow']]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual([['https://pixabay.com/get/test-webformat.jpg']]);
  });

  it('returns empty string if Pixabay returns no hits without fallback', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ hits: [] }),
    } as unknown as Response);

    const adapter = new PixabayImageAdapter();
    const result = await adapter.generate([['nonexistentquery']]);

    expect(result).toEqual([[]]);
  });

  it('returns empty string without querying API if keywords are empty', async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;

    const adapter = new PixabayImageAdapter();
    const result = await adapter.generate([['  ']]);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result).toEqual([[]]);
  });
});
