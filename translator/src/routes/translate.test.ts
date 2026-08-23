import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('POST /api/v1/translate', () => {
  it('should successfully translate text using mock translator', async () => {
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
});
