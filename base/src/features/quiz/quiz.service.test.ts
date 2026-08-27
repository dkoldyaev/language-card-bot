import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as quizService from './quiz.service';
import { prisma } from '../../prisma';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';

vi.mock('../../prisma');
const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('Quiz Service', () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return null if user has no words with definitions', async () => {
    prismaMock.word.findMany.mockResolvedValue([]);
    const result = await quizService.generateQuizCard(1);
    expect(result).toBeNull();
  });

  it('should return a random word and a random definition', async () => {
    prismaMock.word.findMany.mockResolvedValue([{ id: 10 }]);
    
    const mockWord = {
      id: 10,
      text: 'hello',
      userId: 1,
      createdAt: new Date(),
      definitions: [
        {
          id: 100,
          text: 'a greeting',
          wordId: 10,
          createdAt: new Date(),
          translation: {
            id: 1000,
            text: 'привет',
            definitionId: 100,
            createdAt: new Date()
          }
        }
      ]
    };
    
    prismaMock.word.findUnique.mockResolvedValue(mockWord as any);

    const result = await quizService.generateQuizCard(1);

    expect(result).not.toBeNull();
    expect(result?.word.text).toBe('hello');
    expect(result?.definition.text).toBe('a greeting');
    expect(result?.definition.translation?.text).toBe('привет');
  });

  it('should return up to 5 random variants excluding the current word', async () => {
    prismaMock.word.findMany.mockResolvedValue([
      { id: 1, text: 'w1' },
      { id: 2, text: 'w2' },
      { id: 3, text: 'w3' },
      { id: 4, text: 'w4' },
      { id: 5, text: 'w5' },
      { id: 6, text: 'w6' },
      { id: 7, text: 'w7' },
    ] as any);
    prismaMock.word.findUnique.mockResolvedValue({ text: 'correct_word' } as any);

    const result = await quizService.getQuizVariants(1, 10);
    
    expect(result.length).toBe(5);
    expect(prismaMock.word.findMany).toHaveBeenCalledWith({
      where: {
        userId: 1,
        id: { not: 10 }
      },
      select: expect.objectContaining({ text: true })
    });
  });

  describe('getNextDefinition', () => {
    it('should return null if word not found', async () => {
      prismaMock.word.findUnique.mockResolvedValue(null);
      const result = await quizService.getNextDefinition(10, 100);
      expect(result).toBeNull();
    });

    it('should return another definition if available', async () => {
      prismaMock.word.findUnique.mockResolvedValue({
        id: 10,
        definitions: [
          { id: 100, text: 'd1' },
          { id: 101, text: 'd2' }
        ]
      } as any);

      const result = await quizService.getNextDefinition(10, 100);
      expect(result?.id).toBe(101);
    });
  });
});
