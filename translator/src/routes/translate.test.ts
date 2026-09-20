import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redisClient } from '../core/cache';
import type { ITranslator } from '../core/ITranslator';
import { TranslatorFactory } from '../core/TranslatorFactory';
import app from '../index';

// Mock the TranslatorFactory
vi.mock('../core/TranslatorFactory', () => ({
  TranslatorFactory: {
    getTranslator: vi.fn(),
  },
}));

const { mockPipeline } = vi.hoisted(() => ({
  mockPipeline: {
    set: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  },
}));

// Mock Redis cache client
vi.mock('../core/cache', () => ({
  redisClient: {
    mget: vi.fn().mockImplementation(async (keys: string[]) => keys.map(() => null)),
    pipeline: vi.fn().mockReturnValue(mockPipeline),
  },
}));

describe('POST /api/v1/translate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 for missing fields', async () => {
    const response = await request(app)
      .post('/api/v1/translate')
      .send({
        sourceLanguage: 'en',
        // targetLanguage missing
        texts: ['Hello world'],
        translatorApp: 'mock',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid request data');
    expect(response.body.details).toBeDefined();
  });

  it('should return 400 when texts is empty array', async () => {
    const response = await request(app)
      .post('/api/v1/translate')
      .send({
        sourceLanguage: 'en',
        targetLanguage: 'ru',
        texts: [],
        translatorApp: 'mock',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid request data');
  });

  it('should successfully translate texts array using mock translator', async () => {
    const mockTranslator: ITranslator = {
      translate: vi.fn().mockResolvedValue(['[MOCK: en -> ru] Cat', '[MOCK: en -> ru] Dog']),
    };
    vi.mocked(TranslatorFactory.getTranslator).mockReturnValue(mockTranslator);

    const response = await request(app)
      .post('/api/v1/translate')
      .send({
        sourceLanguage: 'en',
        targetLanguage: 'ru',
        texts: ['Cat', 'Dog'],
        translatorApp: 'mock',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      translations: ['[MOCK: en -> ru] Cat', '[MOCK: en -> ru] Dog'],
    });

    expect(TranslatorFactory.getTranslator).toHaveBeenCalledWith('mock');
    expect(mockTranslator.translate).toHaveBeenCalledWith(['Cat', 'Dog'], 'en', 'ru');
    expect(redisClient.mget).toHaveBeenCalledTimes(1);
    expect(mockPipeline.set).toHaveBeenCalledTimes(2);
    expect(mockPipeline.exec).toHaveBeenCalledTimes(1);
  });

  it('should use cached translations and only translate uncached texts', async () => {
    vi.mocked(redisClient.mget).mockImplementation(async (keys: string[]) => {
      return keys.map((key) => (key.includes('Cat') ? 'Кот' : null));
    });

    const googleMock: ITranslator = {
      translate: vi.fn().mockResolvedValue(['Собака']),
    };
    vi.mocked(TranslatorFactory.getTranslator).mockReturnValue(googleMock);

    const response = await request(app)
      .post('/api/v1/translate')
      .send({
        sourceLanguage: 'en',
        targetLanguage: 'ru',
        texts: ['Cat', 'Dog'],
        translatorApp: 'googletranslate',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      translations: ['Кот', 'Собака'],
    });

    expect(TranslatorFactory.getTranslator).toHaveBeenCalledWith('googletranslate');
    expect(googleMock.translate).toHaveBeenCalledWith(['Dog'], 'en', 'ru');
    expect(redisClient.mget).toHaveBeenCalledTimes(1);
    expect(mockPipeline.set).toHaveBeenCalledTimes(1);
    expect(mockPipeline.exec).toHaveBeenCalledTimes(1);
  });
});
