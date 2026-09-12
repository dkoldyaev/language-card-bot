import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LLMAdapter } from './LLMAdapter';

describe('LLMAdapter', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should send correct payload to LLM service and return definitions', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          definitions: ['Definition 1', 'Definition 2'],
        },
      }),
    });
    global.fetch = mockFetch;

    const adapter = new LLMAdapter({
      provider: 'mistral',
      model: 'mistral-large-latest',
      llmServiceUrl: 'http://llm:3003/api/v1/generate',
    });

    const result = await adapter.define('apple', 'en');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('http://llm:3003/api/v1/generate');
    expect(options.method).toBe('POST');
    
    const parsedBody = JSON.parse(options.body);
    expect(parsedBody.provider).toBe('mistral');
    expect(parsedBody.model).toBe('mistral-large-latest');
    expect(parsedBody.prompt).toContain('apple');
    expect(parsedBody.prompt).toContain('en');
    expect(parsedBody.jsonFormat).toBeDefined();

    expect(result).toEqual(['Definition 1', 'Definition 2']);
  });

  it('should throw error when LLM service returns non-ok status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error in LLM',
    });

    const adapter = new LLMAdapter({
      provider: 'gemini',
      model: 'gemini-1.5-flash',
    });

    await expect(adapter.define('test', 'en')).rejects.toThrow('LLM service error (500)');
  });

  it('should throw error when LLM service returns malformed data', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          wrongField: 'no definitions',
        },
      }),
    });

    const adapter = new LLMAdapter({
      provider: 'mistral',
    });

    await expect(adapter.define('test', 'en')).rejects.toThrow('Unexpected response format');
  });
});
