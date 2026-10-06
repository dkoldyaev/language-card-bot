import { prisma } from '../../prisma';
import { invalidateDashboardCache } from '../dashboard/dashboard.service';
import type { MigrateGuestRequest } from './auth.type';

export async function migrateGuestData(userId: number, payload: MigrateGuestRequest) {
  const result = await prisma.$transaction(async (tx) => {
    const dictionaries = new Map<string, { id: number }>();
    const existingDictionaries = await tx.dictionary.findMany({ where: { userId } });

    for (const dictionary of existingDictionaries) {
      dictionaries.set(`${dictionary.targetLanguage.toLowerCase()}:${dictionary.baseLanguage.toLowerCase()}`, dictionary);
    }

    for (const dictionary of payload.dictionaries) {
      const targetLanguage = dictionary.targetLanguage.toLowerCase();
      const baseLanguage = dictionary.baseLanguage.toLowerCase();
      const key = `${targetLanguage}:${baseLanguage}`;
      if (!dictionaries.has(key)) {
        const created = await tx.dictionary.create({
          data: { name: dictionary.name, targetLanguage, baseLanguage, userId },
        });
        dictionaries.set(key, created);
      }
    }

    const wordIds = new Map<string, number>();
    for (const word of payload.words) {
      const targetLanguage = word.targetLanguage.toLowerCase();
      const baseLanguage = word.baseLanguage.toLowerCase();
      const dictionaryKey = `${targetLanguage}:${baseLanguage}`;
      let dictionary = dictionaries.get(dictionaryKey);
      if (!dictionary) {
        dictionary = await tx.dictionary.create({
          data: {
            name: `${targetLanguage.toUpperCase()} Dictionary`,
            targetLanguage,
            baseLanguage,
            userId,
          },
        });
        dictionaries.set(dictionaryKey, dictionary);
      }

      const text = word.text.trim().toLowerCase();
      const existing = await tx.word.findUnique({
        where: { dictionaryId_text: { dictionaryId: dictionary.id, text } },
        include: { definitions: { include: { translation: true } } },
      });
      const stored = existing ? existing : await tx.word.create({
        data: {
          text,
          dictionaryId: dictionary.id,
          definitions: {
            create: word.definitions.map((definition) => ({
              text: definition.text.trim(),
              translation: definition.translation?.trim()
                ? { create: { text: definition.translation.trim() } }
                : undefined,
            })),
          },
        },
        include: { definitions: { include: { translation: true } } },
      });

      if (existing) {
        for (const definition of word.definitions) {
          const textValue = definition.text.trim();
          const matchingDefinition = stored.definitions.find((item) => item.text.toLowerCase() === textValue.toLowerCase());
          if (!matchingDefinition) {
            await tx.definition.create({
              data: {
                text: textValue,
                wordId: stored.id,
                translation: definition.translation?.trim()
                  ? { create: { text: definition.translation.trim() } }
                  : undefined,
              },
            });
          }
        }
      }
      wordIds.set(text, stored.id);
    }

    const attempts = payload.quizAttempts.flatMap((attempt) => {
      const wordId = wordIds.get(attempt.wordText.trim().toLowerCase());
      if (!wordId) return [];
      const createdAt = attempt.createdAt ? new Date(attempt.createdAt) : new Date();
      return [{
        userId,
        wordId,
        result: attempt.result,
        createdAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt,
      }];
    });
    if (attempts.length > 0) {
      await tx.quizAttempt.createMany({ data: attempts });
    }

    const allDictionaries = await tx.dictionary.findMany({
      where: { userId },
      include: { _count: { select: { words: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const state = await tx.userState.findUnique({ where: { userId } });
    const activeDictionaryId = state?.activeDictionaryId && allDictionaries.some((dictionary) => dictionary.id === state.activeDictionaryId)
      ? state.activeDictionaryId
      : allDictionaries.length > 0 ? allDictionaries[0].id : null;
    if (activeDictionaryId !== null) {
      await tx.userState.upsert({
        where: { userId },
        create: { userId, activeDictionaryId },
        update: { activeDictionaryId },
      });
    }

    return {
      activeDictionaryId,
      dictionaries: allDictionaries.map((dictionary) => ({
        id: dictionary.id,
        name: dictionary.name,
        targetLanguage: dictionary.targetLanguage,
        baseLanguage: dictionary.baseLanguage,
        wordCount: dictionary._count.words,
        isActive: dictionary.id === activeDictionaryId,
        createdAt: dictionary.createdAt.toISOString(),
      })),
    };
  });

  await invalidateDashboardCache(userId);
  return result;
}
