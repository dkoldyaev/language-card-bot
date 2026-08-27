import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoogleTranslator } from './GoogleTranslator';

vi.mock('../core/env', () => ({
  env: {
    GOOGLE_TRANSLATE_API_KEY: 'test-api-key',
  }
}));

describe('GoogleTranslator', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    // Suppress console error/warn in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should successfully translate text', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: {
          translations: [{ translatedText: 'Привет мир' }]
        }
      })
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    const translator = new GoogleTranslator();
    const result = await translator.translate('Hello world', 'en', 'ru');

    expect(result).toBe('Привет мир');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('test-api-key'),
      expect.objectContaining({body: JSON.stringify({q: 'Hello world', source: 'en', target: 'ru', format: 'text'})}),
    );
  });

  it('should throw an error when fetch fails (e.g. 400 Bad Request)', async () => {
    const mockResponse = {
      ok: false,
      status: 400,
      text: vi.fn().mockResolvedValue('Bad Request Data')
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    const translator = new GoogleTranslator();
    
    await expect(translator.translate('Hello', 'en', 'ru')).rejects.toThrow(
      'Google Translate API error: 400 Bad Request Data'
    );
    
    expect(console.error).toHaveBeenCalledWith(
      'Error translating with Google API:',
      expect.any(Error)
    );
  });
});
