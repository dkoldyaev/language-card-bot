import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateQuizCard } from './quiz.service';
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
    const result = await generateQuizCard(1);
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

    const result = await generateQuizCard(1);

    expect(result).not.toBeNull();
    expect(result?.word.text).toBe('hello');
    expect(result?.definition.text).toBe('a greeting');
    expect(result?.definition.translation?.text).toBe('привет');
  });
});
