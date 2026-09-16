import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { TranslatorFactory } from '../core/TranslatorFactory';
import { ITranslator } from '../core/ITranslator';
import { redisClient } from '../core/cache';

// Mock the TranslatorFactory
vi.mock('../core/TranslatorFactory', () => ({
  TranslatorFactory: {
    getTranslator: vi.fn(),
  },
}));

// Mock Redis cache client
vi.mock('../core/cache', () => ({
  redisClient: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
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
    expect(redisClient.set).toHaveBeenCalledTimes(2);
  });

  it('should use cached translations and only translate uncached texts', async () => {
    vi.mocked(redisClient.get).mockImplementation(async (key: string) => {
      if (key.includes('Cat')) {
        return 'Кот';
      }
      return null;
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
    expect(redisClient.set).toHaveBeenCalledTimes(1);
  });
});
