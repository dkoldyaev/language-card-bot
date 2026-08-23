import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { defineRouter } from './define';
import { DefinerFactory } from '../core/DefinerFactory';
import { IDefiner } from '../core/IDefiner';

// Mock the DefinerFactory
vi.mock('../core/DefinerFactory', () => ({
  DefinerFactory: {
    getDefiner: vi.fn(),
  },
}));

const app = express();
app.use(express.json());
app.use('/api/v1/define', defineRouter);

describe('POST /api/v1/define', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 if required fields are missing', async () => {
    const res = await request(app)
      .post('/api/v1/define')
      .send({});
      
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request data');
  });

  it('should return definitions when using mock provider directly via API', async () => {
    const mockDefiner: IDefiner = {
      define: vi.fn().mockResolvedValue(['[Mock] Definition 1', '[Mock] Definition 2']),
    };
    vi.mocked(DefinerFactory.getDefiner).mockReturnValue(mockDefiner);

    const res = await request(app)
      .post('/api/v1/define')
      .send({
        text: 'hello',
        language: 'en',
        definerApp: 'mock'
      });
      
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('definitions');
    expect(Array.isArray(res.body.definitions)).toBe(true);
    expect(res.body.definitions).toEqual(['[Mock] Definition 1', '[Mock] Definition 2']);
    
    expect(DefinerFactory.getDefiner).toHaveBeenCalledWith('mock');
    expect(mockDefiner.define).toHaveBeenCalledWith('hello', 'en');
  });

  it('should call mistral adapter when specified and return mocked results', async () => {
    const mistralMock: IDefiner = {
      define: vi.fn().mockResolvedValue(['Mistral Definition 1']),
    };
    vi.mocked(DefinerFactory.getDefiner).mockReturnValue(mistralMock);

    const res = await request(app)
      .post('/api/v1/define')
      .send({
        text: 'bonjour',
        language: 'fr',
        definerApp: 'mistral'
      });
      
    expect(res.status).toBe(200);
    expect(res.body.definitions).toHaveLength(1);
    expect(res.body.definitions[0]).toBe('Mistral Definition 1');

    expect(DefinerFactory.getDefiner).toHaveBeenCalledWith('mistral');
    expect(mistralMock.define).toHaveBeenCalledWith('bonjour', 'fr');
  });

  it('should call gemini adapter when specified and return mocked results', async () => {
    const geminiMock: IDefiner = {
      define: vi.fn().mockResolvedValue(['Gemini Definition 1']),
    };
    vi.mocked(DefinerFactory.getDefiner).mockReturnValue(geminiMock);

    const res = await request(app)
      .post('/api/v1/define')
      .send({
        text: 'hola',
        language: 'es',
        definerApp: 'gemini'
      });
      
    expect(res.status).toBe(200);
    expect(res.body.definitions).toHaveLength(1);
    expect(res.body.definitions[0]).toBe('Gemini Definition 1');

    expect(DefinerFactory.getDefiner).toHaveBeenCalledWith('gemini');
    expect(geminiMock.define).toHaveBeenCalledWith('hola', 'es');
  });
});
