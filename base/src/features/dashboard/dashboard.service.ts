import { invalidateKeysByPattern, redisClient } from '../../core/cache';
import { prisma } from '../../prisma';
import { ensureActiveDictionary } from '../dictionaries/dictionaries.service';

const DASHBOARD_CACHE_TTL_SECONDS = 300;

export async function invalidateDashboardCache(userId: number, dictionaryId?: number): Promise<void> {
  if (dictionaryId) {
    await redisClient.del(`dashboard:stats:${userId}:${dictionaryId}`);
  } else {
    await invalidateKeysByPattern(`dashboard:stats:${userId}:*`);
  }
}

export interface WordMasteryStats {
  newWords: number;
  learningWords: number;
  masteredWords: number;
}

export interface NeedsAttentionWord {
  wordId: number;
  text: string;
  definition: string;
  translation: string | null;
  errorCount: number;
  successCount: number;
  lastResult: string;
}

export interface DayActivity {
  date: string; // YYYY-MM-DD
  dayLabel: string;
  count: number;
}

export interface DashboardStats {
  streak: number;
  todayCount: number;
  totalWords: number;
  totalDefinitions: number;
  totalAttempts: number;
  accuracy: number;
  mastery: WordMasteryStats;
  needsAttention: NeedsAttentionWord[];
  weeklyActivity: DayActivity[];
}

export function calculateStreak(dates: Date[], now: Date = new Date()): number {
  if (dates.length === 0) return 0;

  // Normalize to unique YYYY-MM-DD set
  const dayStrings = new Set<string>();
  for (const d of dates) {
    dayStrings.add(d.toISOString().slice(0, 10));
  }

  const todayStr = now.toISOString().slice(0, 10);
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  let currentCheck = new Date(now);
  let streak = 0;

  if (dayStrings.has(todayStr)) {
    // Active today
    streak = 1;
    currentCheck.setUTCDate(currentCheck.getUTCDate() - 1);
  } else if (dayStrings.has(yesterdayStr)) {
    // Not active today yet, but active yesterday (streak not lost)
    streak = 1;
    currentCheck = new Date(yesterday);
    currentCheck.setUTCDate(currentCheck.getUTCDate() - 1);
  } else {
    return 0;
  }

  while (true) {
    const checkStr = currentCheck.toISOString().slice(0, 10);
    if (dayStrings.has(checkStr)) {
      streak++;
      currentCheck.setUTCDate(currentCheck.getUTCDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export async function getDashboardStats(userId: number, targetDictionaryId?: number): Promise<DashboardStats> {
  const dict = targetDictionaryId
    ? (await prisma.dictionary.findFirst({ where: { id: targetDictionaryId, userId } })) ||
      (await ensureActiveDictionary(userId))
    : await ensureActiveDictionary(userId);

  const cacheKey = `dashboard:stats:${userId}:${dict.id}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // fallback to database fetch on corrupted cache
    }
  }

  // Fetch words with definitions and translations
  const words = await prisma.word.findMany({
    where: { dictionaryId: dict.id },
    include: {
      definitions: {
        include: { translation: true },
        orderBy: { id: 'asc' },
      },
    },
  });

  const totalWords = words.length;
  const totalDefinitions = words.reduce((sum, w) => sum + w.definitions.length, 0);

  // Fetch all user attempts for overall streak
  const allUserAttempts = await prisma.quizAttempt.findMany({
    where: { userId },
    select: { createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  const streak = calculateStreak(allUserAttempts.map((a) => a.createdAt));

  // Fetch attempts specifically for this dictionary's words
  const dictAttempts = await prisma.quizAttempt.findMany({
    where: {
      userId,
      word: { dictionaryId: dict.id },
    },
    include: {
      word: {
        include: {
          definitions: {
            include: { translation: true },
            orderBy: { id: 'asc' },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalAttempts = dictAttempts.length;
  const successCount = dictAttempts.filter((a) => a.result === 'SUCCESS').length;
  const accuracy = totalAttempts > 0 ? Math.round((successCount / totalAttempts) * 100) : 0;

  // Today count (UTC calendar day)
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCount = dictAttempts.filter((a) => a.createdAt.toISOString().slice(0, 10) === todayStr).length;

  // Group attempts by word
  const attemptsByWord = new Map<number, typeof dictAttempts>();
  for (const att of dictAttempts) {
    const list = attemptsByWord.get(att.wordId) || [];
    list.push(att);
    attemptsByWord.set(att.wordId, list);
  }

  let newWords = 0;
  let learningWords = 0;
  let masteredWords = 0;

  const candidateProblemWords: NeedsAttentionWord[] = [];

  for (const word of words) {
    const wordAttempts = attemptsByWord.get(word.id);
    if (!wordAttempts || wordAttempts.length === 0) {
      newWords++;
      continue;
    }

    // Check mastery: 3 or more attempts and the latest 3 are ALL SUCCESS
    const latestThree = wordAttempts.slice(0, 3);
    const isMastered =
      latestThree.length >= 3 && latestThree.every((att) => att.result === 'SUCCESS');

    if (isMastered) {
      masteredWords++;
    } else {
      learningWords++;
    }

    const wordErrors = wordAttempts.filter((a) => a.result !== 'SUCCESS').length;
    const wordSuccess = wordAttempts.length - wordErrors;
    const latestResult = wordAttempts[0].result;

    // Needs attention criteria: has errors and latest attempt is not success OR error rate >= 40%
    const errorRate = wordErrors / wordAttempts.length;
    if (wordErrors > 0 && (latestResult !== 'SUCCESS' || errorRate >= 0.4)) {
      const def = word.definitions[0];
      candidateProblemWords.push({
        wordId: word.id,
        text: word.text,
        definition: def ? def.text : '',
        translation: def?.translation ? def.translation.text : null,
        errorCount: wordErrors,
        successCount: wordSuccess,
        lastResult: latestResult,
      });
    }
  }

  // Sort candidate problem words by errorCount desc, then recent errors
  candidateProblemWords.sort((a, b) => {
    if (b.errorCount !== a.errorCount) return b.errorCount - a.errorCount;
    return a.lastResult === 'INCORRECT' ? -1 : 1;
  });
  const needsAttention = candidateProblemWords.slice(0, 5);

  // Weekly activity (last 7 days, including today)
  const weeklyActivity: DayActivity[] = [];
  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = dictAttempts.filter((a) => a.createdAt.toISOString().slice(0, 10) === dateStr).length;
    const dayLabel = dayNames[d.getUTCDay()];
    weeklyActivity.push({
      date: dateStr,
      dayLabel,
      count,
    });
  }

  const result: DashboardStats = {
    streak,
    todayCount,
    totalWords,
    totalDefinitions,
    totalAttempts,
    accuracy,
    mastery: {
      newWords,
      learningWords,
      masteredWords,
    },
    needsAttention,
    weeklyActivity,
  };

  await redisClient.set(cacheKey, JSON.stringify(result), 'EX', DASHBOARD_CACHE_TTL_SECONDS);

  return result;
}
