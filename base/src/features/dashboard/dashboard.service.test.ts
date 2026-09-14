import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateStreak, getDashboardStats } from './dashboard.service';
import { prisma } from '../../prisma';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';

vi.mock('../../prisma');
const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('calculateStreak', () => {
  it('returns 0 for empty dates', () => {
    expect(calculateStreak([])).toBe(0);
  });

  it('returns 1 if active today only', () => {
    const today = new Date('2026-09-14T10:00:00Z');
    expect(calculateStreak([new Date('2026-09-14T08:00:00Z')], today)).toBe(1);
  });

  it('returns 1 if active yesterday and not yet today', () => {
    const today = new Date('2026-09-14T10:00:00Z');
    expect(calculateStreak([new Date('2026-09-13T18:00:00Z')], today)).toBe(1);
  });

  it('calculates multiple consecutive days correctly', () => {
    const today = new Date('2026-09-14T10:00:00Z');
    const dates = [
      new Date('2026-09-14T09:00:00Z'),
      new Date('2026-09-13T12:00:00Z'),
      new Date('2026-09-12T15:00:00Z'),
      new Date('2026-09-11T10:00:00Z'),
      // gap on 10th
      new Date('2026-09-09T10:00:00Z'),
    ];
    expect(calculateStreak(dates, today)).toBe(4);
  });

  it('returns 0 if last active was 2 days ago', () => {
    const today = new Date('2026-09-14T10:00:00Z');
    const dates = [new Date('2026-09-12T10:00:00Z')];
    expect(calculateStreak(dates, today)).toBe(0);
  });
});

describe('getDashboardStats', () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns zero stats for empty dictionary and no attempts', async () => {
    prismaMock.dictionary.findFirst.mockResolvedValue({
      id: 1,
      name: 'English',
      targetLanguage: 'en',
      baseLanguage: 'ru',
      userId: 1,
      createdAt: new Date(),
    });
    prismaMock.word.findMany.mockResolvedValue([]);
    prismaMock.quizAttempt.findMany.mockResolvedValue([]);

    const stats = await getDashboardStats(1, 1);

    expect(stats.streak).toBe(0);
    expect(stats.todayCount).toBe(0);
    expect(stats.totalWords).toBe(0);
    expect(stats.totalDefinitions).toBe(0);
    expect(stats.accuracy).toBe(0);
    expect(stats.mastery.newWords).toBe(0);
    expect(stats.mastery.learningWords).toBe(0);
    expect(stats.mastery.masteredWords).toBe(0);
    expect(stats.needsAttention).toHaveLength(0);
    expect(stats.weeklyActivity).toHaveLength(7);
  });

  it('categorizes words into new, learning, and mastered and identifies problem words', async () => {
    prismaMock.dictionary.findFirst.mockResolvedValue({
      id: 1,
      name: 'English',
      targetLanguage: 'en',
      baseLanguage: 'ru',
      userId: 1,
      createdAt: new Date(),
    });

    const mockWords = [
      {
        id: 101,
        text: 'apple',
        dictionaryId: 1,
        createdAt: new Date(),
        definitions: [{ id: 1, text: 'A fruit', wordId: 101, createdAt: new Date(), translation: { id: 1, text: 'яблоко', definitionId: 1, createdAt: new Date() } }],
      },
      {
        id: 102,
        text: 'banana',
        dictionaryId: 1,
        createdAt: new Date(),
        definitions: [{ id: 2, text: 'A yellow fruit', wordId: 102, createdAt: new Date(), translation: { id: 2, text: 'банан', definitionId: 2, createdAt: new Date() } }],
      },
      {
        id: 103,
        text: 'cherry',
        dictionaryId: 1,
        createdAt: new Date(),
        definitions: [{ id: 3, text: 'A red berry', wordId: 103, createdAt: new Date(), translation: { id: 3, text: 'вишня', definitionId: 3, createdAt: new Date() } }],
      },
    ];

    prismaMock.word.findMany.mockResolvedValue(mockWords as any);

    const now = new Date();
    // Attempts for user overall (allUserAttempts)
    prismaMock.quizAttempt.findMany
      .mockResolvedValueOnce([
        { createdAt: now } as any,
      ])
      // Attempts for dictionary
      .mockResolvedValueOnce([
        // word 101 (apple): 3 SUCCESS -> MASTERED
        { id: 1, userId: 1, wordId: 101, result: 'SUCCESS', createdAt: now, word: mockWords[0] } as any,
        { id: 2, userId: 1, wordId: 101, result: 'SUCCESS', createdAt: now, word: mockWords[0] } as any,
        { id: 3, userId: 1, wordId: 101, result: 'SUCCESS', createdAt: now, word: mockWords[0] } as any,
        // word 102 (banana): 1 INCORRECT, 1 SUCCESS -> LEARNING & NEEDS ATTENTION
        { id: 4, userId: 1, wordId: 102, result: 'INCORRECT', createdAt: now, word: mockWords[1] } as any,
        { id: 5, userId: 1, wordId: 102, result: 'SUCCESS', createdAt: now, word: mockWords[1] } as any,
        // word 103 (cherry): no attempts -> NEW
      ]);

    const stats = await getDashboardStats(1, 1);

    expect(stats.totalWords).toBe(3);
    expect(stats.mastery.masteredWords).toBe(1);
    expect(stats.mastery.learningWords).toBe(1);
    expect(stats.mastery.newWords).toBe(1);
    expect(stats.accuracy).toBe(80); // 4 success out of 5 attempts = 80%
    expect(stats.needsAttention).toHaveLength(1);
    expect(stats.needsAttention[0].text).toBe('banana');
    expect(stats.needsAttention[0].translation).toBe('банан');
  });
});
