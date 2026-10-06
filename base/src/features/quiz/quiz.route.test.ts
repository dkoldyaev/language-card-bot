import type { PrismaClient, UserState } from '@prisma/client';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type mockDeep, mockReset } from 'vitest-mock-extended';
import app from '../../app';
import { env } from '../../core/env';
import { prisma } from '../../prisma';
import { publishEvent } from '../event_bus/event_bus.service';
import * as quizService from './quiz.service';

vi.mock('../../prisma');
vi.mock('../event_bus/event_bus.service', () => ({
  publishEvent: vi.fn()
}));

const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('Quiz Route', () => {
  const JWT_SECRET = env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    vi.mocked(publishEvent).mockResolvedValue();
    mockReset(prismaMock);
    vi.restoreAllMocks();
    prismaMock.userFeatureFlag.findMany.mockResolvedValue([]);

    prismaMock.userState.findUnique.mockResolvedValue({
      id: 1,
      userId: 1,
      activeDictionaryId: 5,
      currentWordId: null,
      currentDefinitionId: null,
      showVariants: false,
      showDefinitionTranslation: false,
    } as UserState);

    prismaMock.dictionary.findFirst.mockResolvedValue({
      id: 5,
      name: 'EN (RU)',
      targetLanguage: 'en',
      baseLanguage: 'ru',
      userId: 1,
      createdAt: new Date(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 if user has no valid words for quiz', async () => {
    const token = jwt.sign({ id: 1, username: 'test_user' }, JWT_SECRET, { expiresIn: '1h' });
    
    vi.spyOn(quizService, 'generateQuizCard').mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/quiz/start')
      .send({ dictionaryId: 5 })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Not enough words in dictionary to start quiz');
  });

  it('should start quiz, update state and publish event', async () => {
    const token = jwt.sign({ id: 1, username: 'test_user' }, JWT_SECRET, { expiresIn: '1h' });
    
    const mockCardData = {
      word: { id: 10, text: 'hello', dictionaryId: 5, createdAt: new Date() },
      definition: {
        id: 100,
        text: 'a greeting',
        wordId: 10,
        createdAt: new Date(),
        translation: { id: 1000, text: 'привет', definitionId: 100, createdAt: new Date() }
      }
    };
    
    vi.spyOn(quizService, 'generateQuizCard').mockResolvedValue(mockCardData as Awaited<ReturnType<typeof quizService.generateQuizCard>>);
    prismaMock.userState.update.mockResolvedValue({} as UserState);

    const res = await request(app)
      .post('/api/v1/quiz/start')
      .send({ dictionaryId: 5 })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Quiz started');
    
    expect(prismaMock.userState.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 1 },
      data: expect.objectContaining({
        showVariants: false,
        showDefinitionTranslation: false,
        currentDefinitionId: 100,
        currentWordId: 10
      })
    }));

    expect(publishEvent).toHaveBeenCalledWith('test_user', expect.objectContaining({
      type: 'quiz_card',
      wordId: 10,
      definition: expect.objectContaining({
        id: 100,
        text: 'a greeting',
        translation: 'привет'
      })
    }));
  });

  describe('POST /api/v1/quiz/variants', () => {
    it('should return 400 if user state is not QUIZ', async () => {
      const token = jwt.sign({ id: 1, username: 'test_user' }, JWT_SECRET, { expiresIn: '1h' });
      prismaMock.userState.findUnique.mockResolvedValue({ currentWordId: null } as UserState);

      const res = await request(app)
        .post('/api/v1/quiz/variants')
        .send({ dictionaryId: 5 })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Quiz not active or current word not set');
    });

    it('should return variants and publish event', async () => {
      const token = jwt.sign({ id: 1, username: 'test_user' }, JWT_SECRET, { expiresIn: '1h' });
      
      prismaMock.userState.findUnique.mockResolvedValue({
        userId: 1,
        currentWordId: 10,
        activeDictionaryId: 5,
      } as UserState);

      vi.spyOn(quizService, 'getQuizVariants').mockResolvedValue([
        'w1', 'w2', 'w3', 'w4', 'w5'
      ]);
      prismaMock.userState.update.mockResolvedValue({} as UserState);

      const res = await request(app)
        .post('/api/v1/quiz/variants')
        .send({ dictionaryId: 5 })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.variants.length).toBe(5);
      expect(res.body.variants[0]).toBe('w1');

      expect(prismaMock.userState.update).toHaveBeenCalledWith({
        where: { userId: 1 },
        data: { showVariants: true }
      });

      expect(publishEvent).toHaveBeenCalledWith('test_user', expect.objectContaining({
        type: 'quiz_variants',
        variants: expect.any(Array)
      }));
    });
  });

  describe('POST /api/v1/quiz/translate_definition', () => {
    it('should return 400 if user state is not QUIZ or no currentDefinitionId', async () => {
      const token = jwt.sign({ id: 1, username: 'test_user' }, JWT_SECRET, { expiresIn: '1h' });
      prismaMock.userState.findUnique.mockResolvedValue({ currentDefinitionId: null } as UserState);

      const res = await request(app)
        .post('/api/v1/quiz/translate_definition')
        .send({ dictionaryId: 5 })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Quiz not active or current definition not set');
    });

    it('should return 404 if definition translation not found', async () => {
      const token = jwt.sign({ id: 1, username: 'test_user' }, JWT_SECRET, { expiresIn: '1h' });
      
      prismaMock.userState.findUnique.mockResolvedValue({
        currentDefinitionId: 100
      } as UserState);

      prismaMock.definition.findUnique.mockResolvedValue({ id: 100, translation: null } as UserState);

      const res = await request(app)
        .post('/api/v1/quiz/translate_definition')
        .send({ dictionaryId: 5 })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Translation not found for current definition');
    });

    it('should return translation and publish event', async () => {
      const token = jwt.sign({ id: 1, username: 'test_user' }, JWT_SECRET, { expiresIn: '1h' });
      
      prismaMock.userState.findUnique.mockResolvedValue({
        currentDefinitionId: 100
      } as UserState);

      prismaMock.definition.findUnique.mockResolvedValue({
        id: 100,
        translation: { id: 1000, text: 'привет' }
      });

      prismaMock.userState.update.mockResolvedValue({} as UserState);

      const res = await request(app)
        .post('/api/v1/quiz/translate_definition')
        .send({ dictionaryId: 5 })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.translation).toBe('привет');

      expect(prismaMock.userState.update).toHaveBeenCalledWith({
        where: { userId: 1 },
        data: { showDefinitionTranslation: true }
      });

      expect(publishEvent).toHaveBeenCalledWith('test_user', expect.objectContaining({
        type: 'quiz_definition_translation',
        translation: 'привет'
      }));
    });
  });

  describe('POST /api/v1/quiz/answer', () => {
    it('should evaluate answer and enqueue cleanup', async () => {
      const token = jwt.sign({ id: 1, username: 'test_user' }, JWT_SECRET, { expiresIn: '1h' });
      
      prismaMock.userState.findUnique.mockResolvedValue({
        currentWordId: 10
      } as UserState);

      prismaMock.word.findUnique.mockResolvedValue({
        id: 10,
        text: 'apple',
        createdAt: new Date(),
        dictionaryId: 0
      });

      const res = await request(app)
        .post('/api/v1/quiz/answer')
        .set('Authorization', `Bearer ${token}`)
        .send({ suggestion: 'apple', dictionaryId: 5 });

      expect(res.status).toBe(200);
      expect(res.body.evaluation.result).toBe('SUCCESS');
      
      expect(publishEvent).toHaveBeenCalledWith('test_user', expect.objectContaining({
        type: 'quiz_answer_evaluation',
        result: 'SUCCESS',
        suggestion: 'apple'
      }));
    });
  });

  describe('POST /api/v1/quiz/next_card', () => {
    it('should generate next card and update state', async () => {
      const token = jwt.sign({ id: 1, username: 'test_user' }, JWT_SECRET, { expiresIn: '1h' });
      
      prismaMock.userState.findUnique.mockResolvedValue({
        currentWordId: 10,
        activeDictionaryId: 5,
      } as UserState);

      vi.spyOn(quizService, 'generateQuizCard').mockResolvedValue({
        word: { id: 20, text: 'banana' },
        definition: { id: 200, text: 'yellow fruit', translation: { text: 'банан' } }
      } as UserState);

      prismaMock.userState.update.mockResolvedValue({} as UserState);

      const res = await request(app)
        .post('/api/v1/quiz/next_card')
        .send({ dictionaryId: 5 })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(prismaMock.userState.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: 1 },
        data: expect.objectContaining({
          showVariants: false,
          showDefinitionTranslation: false,
          currentDefinitionId: 200,
          currentWordId: 20
        })
      }));
      expect(publishEvent).toHaveBeenCalledWith('test_user', expect.objectContaining({
        type: 'quiz_card',
        wordId: 20
      }));
    });
  });

  describe('POST /api/v1/quiz/next_definition', () => {
    it('should fetch next definition and update state', async () => {
      const token = jwt.sign({ id: 1, username: 'test_user' }, JWT_SECRET, { expiresIn: '1h' });
      
      prismaMock.userState.findUnique.mockResolvedValue({
        currentWordId: 10,
        currentDefinitionId: 100
      } as UserState);

      vi.spyOn(quizService, 'getNextDefinition').mockResolvedValue({
        id: 101, text: 'another fruit', translation: { text: 'другой фрукт' }
      } as UserState);

      prismaMock.userState.update.mockResolvedValue({} as UserState);

      const res = await request(app)
        .post('/api/v1/quiz/next_definition')
        .send({ dictionaryId: 5 })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(prismaMock.userState.update).toHaveBeenCalledWith({
        where: { userId: 1 },
        data: {
          showVariants: false,
          showDefinitionTranslation: false,
          currentDefinitionId: 101
        }
      });
      expect(publishEvent).toHaveBeenCalledWith('test_user', expect.objectContaining({
        type: 'quiz_card',
        wordId: 10,
        definition: expect.objectContaining({ id: 101 })
      }));
    });
  });
});
