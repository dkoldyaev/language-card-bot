import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DefinerFactory } from '../core/DefinerFactory';
import type { IDefiner } from '../core/IDefiner';
import { defineRouter } from './define';

// Mock the DefinerFactory
vi.mock('../core/DefinerFactory', () => ({
  DefinerFactory: {
    getDefiner: vi.fn(),
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
    get: vi.fn().mockResolvedValue(null),
    mget: vi.fn().mockImplementation(async (keys: string[]) => keys.map(() => null)),
    pipeline: vi.fn().mockReturnValue(mockPipeline),
    set: vi.fn().mockResolvedValue('OK'),
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
      define: vi.fn(),
      defineBatch: vi.fn().mockResolvedValue([
        [
          {
            text: '[Mock] Definition 1',
            partOfSpeech: 'noun',
            tags: ['common'],
            levels: ['A1'],
          },
          {
            text: '[Mock] Definition 2',
            partOfSpeech: 'verb',
            tags: ['slang'],
            levels: ['B1'],
          },
        ],
      ]),
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
    expect(res.body.definitions).toEqual([
      {
        text: '[Mock] Definition 1',
        partOfSpeech: 'noun',
        tags: ['common'],
        levels: ['A1'],
      },
      {
        text: '[Mock] Definition 2',
        partOfSpeech: 'verb',
        tags: ['slang'],
        levels: ['B1'],
      },
    ]);
    
    expect(DefinerFactory.getDefiner).toHaveBeenCalledWith('mock');
    expect(mockDefiner.defineBatch).toHaveBeenCalledWith(['hello'], 'en');
  });

  it('should support batch request with texts array', async () => {
    const mockDefiner: IDefiner = {
      define: vi.fn(),
      defineBatch: vi.fn().mockResolvedValue([
        [
          {
            text: 'Def 1 for word 1',
            partOfSpeech: 'noun',
            tags: [],
            levels: ['A1'],
          },
        ],
        [
          {
            text: 'Def 1 for word 2',
            partOfSpeech: 'verb',
            tags: [],
            levels: ['A2'],
          },
        ],
      ]),
    };
    vi.mocked(DefinerFactory.getDefiner).mockReturnValue(mockDefiner);

    const res = await request(app)
      .post('/api/v1/define')
      .send({
        texts: ['word1', 'word2'],
        language: 'en',
        definerApp: 'mock',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('definitions');
    expect(res.body.definitions).toHaveLength(2);
    expect(res.body.definitions[0][0].text).toBe('Def 1 for word 1');
    expect(res.body.definitions[1][0].text).toBe('Def 1 for word 2');
    expect(mockDefiner.defineBatch).toHaveBeenCalledWith(['word1', 'word2'], 'en');
  });

  it('should call mistral adapter when specified and return mocked results', async () => {
    const mistralMock: IDefiner = {
      define: vi.fn(),
      defineBatch: vi.fn().mockResolvedValue([
        [
          {
            text: 'Mistral Definition 1',
            partOfSpeech: 'noun',
            tags: ['formal'],
            levels: ['C1'],
          },
        ],
      ]),
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
    expect(res.body.definitions[0].text).toBe('Mistral Definition 1');
    expect(res.body.definitions[0].levels).toEqual(['C1']);

    expect(DefinerFactory.getDefiner).toHaveBeenCalledWith('mistral');
    expect(mistralMock.defineBatch).toHaveBeenCalledWith(['bonjour'], 'fr');
  });

  it('should call gemini adapter when specified and return mocked results', async () => {
    const geminiMock: IDefiner = {
      define: vi.fn(),
      defineBatch: vi.fn().mockResolvedValue([
        [
          {
            text: 'Gemini Definition 1',
            partOfSpeech: 'adjective',
            tags: [],
            levels: ['B2'],
          },
        ],
      ]),
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
    expect(res.body.definitions[0].text).toBe('Gemini Definition 1');
    expect(res.body.definitions[0].partOfSpeech).toBe('adjective');

    expect(DefinerFactory.getDefiner).toHaveBeenCalledWith('gemini');
    expect(geminiMock.defineBatch).toHaveBeenCalledWith(['hola'], 'es');
  });

  it('should call llm adapter when specified and return mocked results', async () => {
    const llmMock: IDefiner = {
      define: vi.fn(),
      defineBatch: vi.fn().mockResolvedValue([
        [
          {
            text: 'LLM Definition 1',
            partOfSpeech: 'interjection',
            tags: ['informal'],
            levels: ['A1'],
          },
        ],
      ]),
    };
    vi.mocked(DefinerFactory.getDefiner).mockReturnValue(llmMock);

    const res = await request(app)
      .post('/api/v1/define')
      .send({
        text: 'ciao',
        language: 'it',
        definerApp: 'llm'
      });
      
    expect(res.status).toBe(200);
    expect(res.body.definitions).toHaveLength(1);
    expect(res.body.definitions[0].text).toBe('LLM Definition 1');
    expect(res.body.definitions[0].levels).toEqual(['A1']);

    expect(DefinerFactory.getDefiner).toHaveBeenCalledWith('llm');
    expect(llmMock.defineBatch).toHaveBeenCalledWith(['ciao'], 'it');
  });
});
