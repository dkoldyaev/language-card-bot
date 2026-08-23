import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';
import { TranslatorFactory } from '../core/TranslatorFactory';
import { ITranslator } from '../core/ITranslator';

// Mock the TranslatorFactory
vi.mock('../core/TranslatorFactory', () => ({
  TranslatorFactory: {
    getTranslator: vi.fn(),
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
        text: 'Hello world',
        translatorApp: 'mock',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid request data');
    expect(response.body.details).toBeDefined();
  });

  it('should successfully translate text using mock translator directly via API', async () => {
    const mockTranslator: ITranslator = {
      translate: vi.fn().mockResolvedValue('[MOCK: en -> ru] Hello world'),
    };
    vi.mocked(TranslatorFactory.getTranslator).mockReturnValue(mockTranslator);

    const response = await request(app)
      .post('/api/v1/translate')
      .send({
        sourceLanguage: 'en',
        targetLanguage: 'ru',
        text: 'Hello world',
        translatorApp: 'mock',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      translatedText: '[MOCK: en -> ru] Hello world',
    });

    expect(TranslatorFactory.getTranslator).toHaveBeenCalledWith('mock');
    expect(mockTranslator.translate).toHaveBeenCalledWith('Hello world', 'en', 'ru');
  });

  it('should call google adapter when specified and return mocked results', async () => {
    const googleMock: ITranslator = {
      translate: vi.fn().mockResolvedValue('Привет мир'),
    };
    vi.mocked(TranslatorFactory.getTranslator).mockReturnValue(googleMock);

    const response = await request(app)
      .post('/api/v1/translate')
      .send({
        sourceLanguage: 'en',
        targetLanguage: 'ru',
        text: 'Hello world',
        translatorApp: 'googletranslate',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      translatedText: 'Привет мир',
    });

    expect(TranslatorFactory.getTranslator).toHaveBeenCalledWith('googletranslate');
    expect(googleMock.translate).toHaveBeenCalledWith('Hello world', 'en', 'ru');
  });
});
