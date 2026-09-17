import { prisma } from '../../prisma';
import { MigrateGuestRequest } from './auth.type';
import { invalidateDashboardCache } from '../dashboard/dashboard.service';

export async function migrateGuestData(userId: number, payload: MigrateGuestRequest) {
  const result = await prisma.$transaction(async (tx) => {
    // If replace mode, delete all existing user's dictionaries (cascade deletes words, definitions, etc.)
    if (payload.mode === 'replace') {
      await tx.dictionary.deleteMany({
        where: { userId },
      });
    }

    // 1. Process dictionaries
    const existingDicts = await tx.dictionary.findMany({
      where: { userId },
    });
    const dictMap = new Map<string, typeof existingDicts[0]>();
    for (const d of existingDicts) {
      dictMap.set(`${d.targetLanguage.toLowerCase()}:${d.baseLanguage.toLowerCase()}`, d);
    }

    for (const dict of payload.dictionaries) {
      const targetLang = dict.targetLanguage.toLowerCase();
      const baseLang = dict.baseLanguage.toLowerCase();
      const key = `${targetLang}:${baseLang}`;

      if (!dictMap.has(key)) {
        const created = await tx.dictionary.create({
          data: {
            name: dict.name,
            targetLanguage: targetLang,
            baseLanguage: baseLang,
            userId,
          },
        });
        dictMap.set(key, created);
      }
    }

    // 2. Pre-load existing words
    const dictIds = Array.from(dictMap.values()).map((d) => d.id);
    const existingWords = await tx.word.findMany({
      where: { dictionaryId: { in: dictIds } },
      include: {
        definitions: {
          include: {
            translation: true,
          },
        },
      },
    });

    const wordLookup = new Map<string, typeof existingWords[0]>();
    for (const w of existingWords) {
      wordLookup.set(`${w.dictionaryId}:${w.text.toLowerCase().trim()}`, w);
    }

    const wordMap = new Map<string, { id: number }>();

    for (const word of payload.words) {
      const wordText = word.text.toLowerCase().trim();
      const targetLang = word.targetLanguage.toLowerCase();
      const baseLang = word.baseLanguage.toLowerCase();
      const key = `${targetLang}:${baseLang}`;

      let targetDict = dictMap.get(key);
      if (!targetDict) {
        targetDict = await tx.dictionary.create({
          data: {
            name: `${targetLang.toUpperCase()} Dictionary`,
            targetLanguage: targetLang,
            baseLanguage: baseLang,
            userId,
          },
        });
        dictMap.set(key, targetDict);
      }

      const lookupKey = `${targetDict.id}:${wordText}`;
      let dbWord = wordLookup.get(lookupKey);

      if (!dbWord) {
        dbWord = await tx.word.create({
          data: {
            text: wordText,
            dictionaryId: targetDict.id,
            definitions: {
              create: word.definitions.map((def) => ({
                text: def.text.trim(),
                ...(def.translation && def.translation.trim()
                  ? {
                      translation: {
                        create: { text: def.translation.trim() },
                      },
                    }
                  : {}),
              })),
            },
          },
          include: {
            definitions: {
              include: {
                translation: true,
              },
            },
          },
        });
        wordLookup.set(lookupKey, dbWord);
      } else {
        // Add any missing definitions to the existing word
        for (const def of word.definitions) {
          const defText = def.text.trim();
          const existingDef = dbWord.definitions.find(
            (d) => d.text.toLowerCase() === defText.toLowerCase()
          );

          if (!existingDef) {
            const createdDef = await tx.definition.create({
              data: {
                text: defText,
                wordId: dbWord.id,
              },
            });

            if (def.translation && def.translation.trim()) {
              await tx.definitionTranslation.create({
                data: {
                  text: def.translation.trim(),
                  definitionId: createdDef.id,
                },
              });
            }
          } else if (def.translation && def.translation.trim() && !existingDef.translation) {
            await tx.definitionTranslation.create({
              data: {
                text: def.translation.trim(),
                definitionId: existingDef.id,
              },
            });
          }
        }
      }

      wordMap.set(wordText, { id: dbWord.id });
    }

    // 3. Process quiz attempts in bulk
    const attemptsToCreate: Array<{
      userId: number;
      wordId: number;
      result: 'SUCCESS' | 'CLOSE_MATCH' | 'INCORRECT';
      createdAt: Date;
    }> = [];

    for (const attempt of payload.quizAttempts) {
      const wordText = attempt.wordText.toLowerCase().trim();
      let matchedWord = wordMap.get(wordText);

      if (!matchedWord) {
        const found = await tx.word.findFirst({
          where: {
            dictionary: { userId },
            text: wordText,
          },
        });
        if (found) {
          matchedWord = { id: found.id };
        }
      }

      if (matchedWord) {
        const createdAtDate = attempt.createdAt ? new Date(attempt.createdAt) : new Date();
        attemptsToCreate.push({
          userId,
          wordId: matchedWord.id,
          result: attempt.result,
          createdAt: isNaN(createdAtDate.getTime()) ? new Date() : createdAtDate,
        });
      }
    }

    if (attemptsToCreate.length > 0) {
      await tx.quizAttempt.createMany({
        data: attemptsToCreate,
      });
    }

    // 4. Ensure active dictionary is assigned in userState
    const allDicts = await tx.dictionary.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    if (allDicts.length > 0) {
      const userState = await tx.userState.findUnique({ where: { userId } });
      const currentActive = userState?.activeDictionaryId;
      const isValidActive = currentActive && allDicts.some((d) => d.id === currentActive);

      if (!isValidActive) {
        await tx.userState.upsert({
          where: { userId },
          create: {
            userId,
            activeDictionaryId: allDicts[0].id,
          },
          update: {
            activeDictionaryId: allDicts[0].id,
          },
        });
      }
    }

    // 5. Query final list of dictionaries to return
    const finalDictionaries = await tx.dictionary.findMany({
      where: { userId },
      include: {
        _count: {
          select: { words: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const activeState = await tx.userState.findUnique({ where: { userId } });

    return {
      activeDictionaryId: activeState?.activeDictionaryId || (finalDictionaries[0]?.id ?? null),
      dictionaries: finalDictionaries.map((d) => ({
        id: d.id,
        name: d.name,
        targetLanguage: d.targetLanguage,
        baseLanguage: d.baseLanguage,
        wordCount: d._count.words,
        isActive: d.id === activeState?.activeDictionaryId,
        createdAt: d.createdAt.toISOString(),
      })),
    };
  });

  await invalidateDashboardCache(userId);

  return result;
}
