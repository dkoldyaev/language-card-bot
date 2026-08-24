import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { PrismaClient, UserMode } from '@prisma/client';
import { publishEvent } from '../event_bus/event_bus.service';
import * as quizService from './quiz.service';

vi.mock('../../prisma');
vi.mock('../event_bus/event_bus.service', () => ({
  publishEvent: vi.fn()
}));

const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('Quiz Route', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

  beforeEach(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    vi.mocked(publishEvent).mockResolvedValue();
    mockReset(prismaMock);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 if user has no valid words for quiz', async () => {
    const token = jwt.sign({ id: 1, username: 'test_user' }, JWT_SECRET, { expiresIn: '1h' });
    
    vi.spyOn(quizService, 'generateQuizCard').mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/quiz/start')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Not enough words in dictionary to start quiz');
  });

  it('should start quiz, update state and publish event', async () => {
    const token = jwt.sign({ id: 1, username: 'test_user' }, JWT_SECRET, { expiresIn: '1h' });
    
    const mockCardData = {
      word: { id: 10, text: 'hello', userId: 1, createdAt: new Date() },
      definition: {
        id: 100,
        text: 'a greeting',
        wordId: 10,
        createdAt: new Date(),
        translation: { id: 1000, text: 'привет', definitionId: 100, createdAt: new Date() }
      }
    };
    
    vi.spyOn(quizService, 'generateQuizCard').mockResolvedValue(mockCardData);
    prismaMock.userState.update.mockResolvedValue({} as any);

    const res = await request(app)
      .post('/api/v1/quiz/start')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Quiz started');
    
    expect(prismaMock.userState.update).toHaveBeenCalledWith({
      where: { userId: 1 },
      data: {
        mode: UserMode.QUIZ,
        showVariants: false,
        showDefinitionTranslation: false,
        currentDefinitionId: 100,
        currentWordId: 10
      }
    });

    expect(publishEvent).toHaveBeenCalledWith('test_user', expect.objectContaining({
      type: 'quiz_card',
      wordId: 10,
      definition: {
        id: 100,
        text: 'a greeting',
        translation: 'привет'
      }
    }));
  });

  describe('POST /api/v1/quiz/variants', () => {
    it('should return 400 if user state is not QUIZ', async () => {
      const token = jwt.sign({ id: 1, username: 'test_user' }, JWT_SECRET, { expiresIn: '1h' });
      prismaMock.userState.findUnique.mockResolvedValue({ mode: UserMode.DEFAULT } as any);

      const res = await request(app)
        .post('/api/v1/quiz/variants')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Quiz not active or current word not set');
    });

    it('should return variants and publish event', async () => {
      const token = jwt.sign({ id: 1, username: 'test_user' }, JWT_SECRET, { expiresIn: '1h' });
      
      prismaMock.userState.findUnique.mockResolvedValue({
        mode: UserMode.QUIZ,
        currentWordId: 10
      } as any);

      vi.spyOn(quizService, 'getQuizVariants').mockResolvedValue([
        { id: 1, text: 'w1' },
        { id: 2, text: 'w2' },
        { id: 3, text: 'w3' },
        { id: 4, text: 'w4' },
        { id: 5, text: 'w5' },
      ]);
      prismaMock.userState.update.mockResolvedValue({} as any);

      const res = await request(app)
        .post('/api/v1/quiz/variants')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.variants.length).toBe(5);
      expect(res.body.variants[0].text).toBe('w1');

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
});
