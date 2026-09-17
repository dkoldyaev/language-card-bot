import type { DashboardStats, DictionaryWord, GuestQuizAttempt } from '../../../store/useStore';

export function computeGuestDashboardStats(
  dictionary: DictionaryWord[],
  guestAttempts: GuestQuizAttempt[]
): DashboardStats {
  const totalWords = dictionary.length;
  const totalDefinitions = dictionary.reduce((sum, w) => sum + w.definitions.length, 0);
  const totalAttempts = guestAttempts.length;

  const successfulAttempts = guestAttempts.filter((a) => a.result === 'SUCCESS').length;
  const accuracy = totalAttempts > 0 ? Math.round((successfulAttempts / totalAttempts) * 100) : 0;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAttempts = guestAttempts.filter((a) => a.createdAt.slice(0, 10) === todayStr);

  // Weekly activity (last 7 days)
  const daysMap = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    daysMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const a of guestAttempts) {
    const dStr = a.createdAt.slice(0, 10);
    if (daysMap.has(dStr)) {
      daysMap.set(dStr, (daysMap.get(dStr) || 0) + 1);
    }
  }

  const weeklyActivity = Array.from(daysMap.entries()).map(([date, count]) => {
    const d = new Date(date);
    const dayLabel = d.toLocaleDateString(undefined, { weekday: 'short' });
    return { date, dayLabel, count };
  });

  // Word stats
  const wordAttemptsMap = new Map<string, { success: number; error: number; lastResult: string }>();
  for (const a of guestAttempts) {
    const key = a.wordText.toLowerCase();
    const cur = wordAttemptsMap.get(key) || { success: 0, error: 0, lastResult: a.result };
    if (a.result === 'SUCCESS') cur.success++;
    else cur.error++;
    cur.lastResult = a.result;
    wordAttemptsMap.set(key, cur);
  }

  let newWords = 0;
  let learningWords = 0;
  let masteredWords = 0;

  for (const w of dictionary) {
    const st = wordAttemptsMap.get(w.text.toLowerCase());
    if (!st || (st.success === 0 && st.error === 0)) {
      newWords++;
    } else if (st.success >= 3 && st.error === 0) {
      masteredWords++;
    } else {
      learningWords++;
    }
  }

  const needsAttention = dictionary
    .map((w) => {
      const st = wordAttemptsMap.get(w.text.toLowerCase());
      if (!st || st.error === 0) return null;
      return {
        wordId: w.id,
        text: w.text,
        definition: w.definitions[0]?.text || '',
        translation: w.definitions[0]?.translation?.text || null,
        errorCount: st.error,
        successCount: st.success,
        lastResult: st.lastResult,
      };
    })
    .filter(Boolean) as DashboardStats['needsAttention'];

  return {
    streak: todayAttempts.length > 0 ? 1 : 0,
    todayCount: todayAttempts.length,
    totalWords,
    totalDefinitions,
    totalAttempts,
    accuracy,
    mastery: { newWords, learningWords, masteredWords },
    needsAttention,
    weeklyActivity,
  };
}
