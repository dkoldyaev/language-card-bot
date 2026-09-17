import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FreeDictionaryDefiner } from './FreeDictionaryDefiner';

describe('FreeDictionaryDefiner', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should fetch English definitions and return them without calling translator when language is "en"', async () => {
    const mockFreeDictResponse = {
      entries: [
        {
          senses: [
            { definition: 'A domesticated carnivorous mammal' },
            { definition: 'A male dog' },
          ],
        },
      ],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockFreeDictResponse,
    });
    global.fetch = mockFetch;

    const definer = new FreeDictionaryDefiner({
      translatorApiUrl: 'http://translator:3001/api/v1/translate',
      translatorAppType: 'mock',
    });

    const result = await definer.define('dog', 'en');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('https://freedictionaryapi.com/api/v1/entries/en/dog');
    expect(result).toEqual([
      'A domesticated carnivorous mammal',
      'A male dog',
    ]);
  });

  it('should fetch definitions and translate them via translator service when language is not "en"', async () => {
    const mockFreeDictResponse = {
      entries: [
        {
          senses: [
            { definition: 'A domesticated carnivorous mammal' },
            { definition: 'A loyal pet' },
          ],
        },
      ],
    };

    const mockFetch = vi.fn()
      // First call: FreeDictionary API
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFreeDictResponse,
      })
      // Second call: Translator service
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          translations: [
            'Одомашненное хищное млекопитающее',
            'Преданный питомец',
          ],
        }),
      });

    global.fetch = mockFetch;

    const definer = new FreeDictionaryDefiner({
      translatorApiUrl: 'http://translator:3001/api/v1/translate',
      translatorAppType: 'mock',
    });

    const result = await definer.define('собака', 'ru');

    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Check FreeDictionary API call
    const [freeDictUrl] = mockFetch.mock.calls[0];
    expect(freeDictUrl).toContain('https://freedictionaryapi.com/api/v1/entries/ru/');

    // Check Translator call
    const [translatorUrl, translatorOptions] = mockFetch.mock.calls[1];
    expect(translatorUrl).toBe('http://translator:3001/api/v1/translate');
    expect(translatorOptions.method).toBe('POST');
    const parsedBody = JSON.parse(translatorOptions.body);
    expect(parsedBody.sourceLanguage).toBe('en');
    expect(parsedBody.targetLanguage).toBe('ru');
    expect(parsedBody.texts).toEqual([
      'A domesticated carnivorous mammal',
      'A loyal pet',
    ]);
    expect(parsedBody.translatorApp).toBe('mock');

    expect(result).toEqual([
      'Одомашненное хищное млекопитающее',
      'Преданный питомец',
    ]);
  });

  it('should return empty array when FreeDictionary API returns 404', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });
    global.fetch = mockFetch;

    const definer = new FreeDictionaryDefiner();
    const result = await definer.define('nonexistentword123', 'en');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);
  });

  it('should return empty array when FreeDictionary API returns no definitions', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ entries: [] }),
    });
    global.fetch = mockFetch;

    const definer = new FreeDictionaryDefiner();
    const result = await definer.define('empty', 'ru');

    // Should not call translator because definitions array is empty
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);
  });

  it('should return empty array gracefully when translator service fails', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          entries: [{ senses: [{ definition: 'Some definition' }] }],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Translator failed',
      });

    global.fetch = mockFetch;

    const definer = new FreeDictionaryDefiner();
    const result = await definer.define('test', 'fr');

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual([]);
  });
});
