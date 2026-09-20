import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FreeDictionaryDefiner } from './FreeDictionaryDefiner';

describe('FreeDictionaryDefiner', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should fetch English definitions, determine levels via LLM, and return DefinitionItem[] without translator', async () => {
    const mockFreeDictResponse = {
      entries: [
        {
          partOfSpeech: 'noun',
          senses: [
            { definition: 'A domesticated carnivorous mammal', tags: ['zoology'] },
            { definition: 'A male dog', tags: ['informal'] },
          ],
        },
      ],
    };

    const mockLLMResponse = {
      data: {
        levelsByIndex: [
          { index: 1, levels: ['A1', 'A2'] },
          { index: 2, levels: ['B1'] },
        ],
      },
    };

    const mockFetch = vi.fn()
      // Call 1: FreeDictionary API
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFreeDictResponse,
      })
      // Call 2: LLM service for levels
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockLLMResponse,
      });

    global.fetch = mockFetch;

    const definer = new FreeDictionaryDefiner({
      translatorApiUrl: 'http://translator:3001/api/v1/translate',
      translatorAppType: 'mock',
      llmServiceUrl: 'http://llm:3003/api/v1/generate',
      llmProvider: 'mistral',
      llmModel: 'open-mistral-nemo',
    });

    const result = await definer.define('dog', 'en');

    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Verify FreeDictionary call
    const [freeDictUrl] = mockFetch.mock.calls[0];
    expect(freeDictUrl).toContain('https://freedictionaryapi.com/api/v1/entries/en/dog');

    // Verify LLM call
    const [llmUrl, llmOptions] = mockFetch.mock.calls[1];
    expect(llmUrl).toBe('http://llm:3003/api/v1/generate');
    const parsedLLMBody = JSON.parse(llmOptions.body);
    expect(parsedLLMBody.provider).toBe('mistral');
    expect(parsedLLMBody.model).toBe('open-mistral-nemo');
    expect(parsedLLMBody.prompt).toContain('dog');
    expect(parsedLLMBody.prompt).toContain('A domesticated carnivorous mammal');
    expect(parsedLLMBody.jsonFormat).toBeDefined();

    expect(result).toEqual([
      {
        text: 'A domesticated carnivorous mammal',
        partOfSpeech: 'noun',
        tags: ['zoology'],
        levels: ['A1', 'A2'],
      },
      {
        text: 'A male dog',
        partOfSpeech: 'noun',
        tags: ['informal'],
        levels: ['B1'],
      },
    ]);
  });

  it('should fetch definitions, translate them via translator service, determine levels via LLM when language is not "en"', async () => {
    const mockFreeDictResponse = {
      entries: [
        {
          partOfSpeech: 'noun',
          senses: [
            { definition: 'A domesticated carnivorous mammal', tags: ['zoology'] },
            { definition: 'A loyal pet', tags: ['common'] },
          ],
        },
      ],
    };

    const mockLLMResponse = {
      data: {
        levelsByIndex: [
          { index: 1, levels: ['A1'] },
          { index: 2, levels: ['A2'] },
        ],
      },
    };

    const mockFetch = vi.fn()
      // Call 1: FreeDictionary API
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFreeDictResponse,
      })
      // Call 2: Translator service
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          translations: [
            'Одомашненное хищное млекопитающее',
            'Преданный питомец',
          ],
        }),
      })
      // Call 3: LLM service for levels
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockLLMResponse,
      });

    global.fetch = mockFetch;

    const definer = new FreeDictionaryDefiner({
      translatorApiUrl: 'http://translator:3001/api/v1/translate',
      translatorAppType: 'mock',
      llmServiceUrl: 'http://llm:3003/api/v1/generate',
      llmProvider: 'mistral',
      llmModel: 'open-mistral-nemo',
    });

    const result = await definer.define('собака', 'ru');

    expect(mockFetch).toHaveBeenCalledTimes(3);

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

    // Check LLM levels call
    const [llmUrl, llmOptions] = mockFetch.mock.calls[2];
    expect(llmUrl).toBe('http://llm:3003/api/v1/generate');
    const parsedLLMBody = JSON.parse(llmOptions.body);
    expect(parsedLLMBody.prompt).toContain('Одомашненное хищное млекопитающее');

    expect(result).toEqual([
      {
        text: 'Одомашненное хищное млекопитающее',
        partOfSpeech: 'noun',
        tags: ['zoology'],
        levels: ['A1'],
      },
      {
        text: 'Преданный питомец',
        partOfSpeech: 'noun',
        tags: ['common'],
        levels: ['A2'],
      },
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

    // Should not call translator or LLM because definitions array is empty
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
