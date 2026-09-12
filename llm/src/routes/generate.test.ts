import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { LLMProviderFactory } from '../core/LLMProviderFactory';
import { ILLMProvider } from '../core/ILLMProvider';
import { redisClient } from '../core/cache';

vi.mock('../core/LLMProviderFactory', () => ({
  LLMProviderFactory: {
    getProvider: vi.fn(),
  },
}));

vi.mock('../core/cache', () => ({
  redisClient: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
  },
}));

describe('POST /api/v1/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 if required fields are missing', async () => {
    const res = await request(app)
      .post('/api/v1/generate')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request data');
  });

  it('should return 400 if invalid provider is provided', async () => {
    const res = await request(app)
      .post('/api/v1/generate')
      .send({
        prompt: 'test',
        provider: 'unsupported_provider',
        model: 'some-model',
        jsonFormat: { definitions: ['string'] },
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request data');
  });

  it('should return cached result if present in cache', async () => {
    vi.mocked(redisClient.get).mockResolvedValueOnce(JSON.stringify({ cached: true, definitions: ['Cached 1'] }));

    const res = await request(app)
      .post('/api/v1/generate')
      .send({
        prompt: 'Define hello',
        provider: 'mock',
        model: 'test-model',
        jsonFormat: 'JSON format',
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ cached: true, definitions: ['Cached 1'] });
    expect(LLMProviderFactory.getProvider).not.toHaveBeenCalled();
  });

  it('should call provider and return structured data with string jsonFormat', async () => {
    const mockProvider: ILLMProvider = {
      generate: vi.fn().mockResolvedValue({ definitions: ['Definition 1', 'Definition 2'] }),
    };
    vi.mocked(LLMProviderFactory.getProvider).mockReturnValue(mockProvider);

    const res = await request(app)
      .post('/api/v1/generate')
      .send({
        prompt: 'Define hello',
        provider: 'mock',
        model: 'test-model',
        jsonFormat: 'JSON object with definitions array of strings',
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ definitions: ['Definition 1', 'Definition 2'] });
    expect(LLMProviderFactory.getProvider).toHaveBeenCalledWith('mock');
    expect(mockProvider.generate).toHaveBeenCalledWith({
      prompt: 'Define hello',
      model: 'test-model',
      jsonFormat: 'JSON object with definitions array of strings',
    });
    expect(redisClient.set).toHaveBeenCalled();
  });

  it('should call provider and return structured data with object jsonFormat', async () => {
    const mockProvider: ILLMProvider = {
      generate: vi.fn().mockResolvedValue({ definitions: ['Mistral def 1'] }),
    };
    vi.mocked(LLMProviderFactory.getProvider).mockReturnValue(mockProvider);

    const res = await request(app)
      .post('/api/v1/generate')
      .send({
        prompt: 'Define bonjour',
        provider: 'mistral',
        model: 'mistral-large-latest',
        jsonFormat: {
          type: 'object',
          properties: { definitions: { type: 'array', items: { type: 'string' } } },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ definitions: ['Mistral def 1'] });
    expect(LLMProviderFactory.getProvider).toHaveBeenCalledWith('mistral');
    expect(redisClient.set).toHaveBeenCalled();
  });
});
