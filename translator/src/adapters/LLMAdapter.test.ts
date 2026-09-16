import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LLMAdapter } from './LLMAdapter';

describe('LLMAdapter', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should translate array of texts via LLM service', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: {
          translations: ['Кот', 'Собака'],
        },
      }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    const adapter = new LLMAdapter({
      provider: 'mock',
      model: 'test-model',
      llmServiceUrl: 'http://llm:3003/api/v1/generate',
    });

    const result = await adapter.translate(['Cat', 'Dog'], 'en', 'ru');

    expect(result).toEqual(['Кот', 'Собака']);
    expect(fetch).toHaveBeenCalledTimes(1);
    const calledBody = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as any).body);
    expect(calledBody.prompt).toContain('"Cat"');
    expect(calledBody.prompt).toContain('"Dog"');
    expect(calledBody.jsonFormat.properties.translations.type).toBe('array');
  });

  it('should return empty array for empty input', async () => {
    const adapter = new LLMAdapter({
      provider: 'mock',
      model: 'test-model',
      llmServiceUrl: 'http://llm:3003/api/v1/generate',
    });

    const result = await adapter.translate([], 'en', 'ru');
    expect(result).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should throw error when LLM service fails', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue('Internal Error'),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    const adapter = new LLMAdapter({
      provider: 'mock',
      model: 'test-model',
      llmServiceUrl: 'http://llm:3003/api/v1/generate',
    });

    await expect(adapter.translate(['Cat'], 'en', 'ru')).rejects.toThrow(
      'LLM service error (500): Internal Error'
    );
  });
});
