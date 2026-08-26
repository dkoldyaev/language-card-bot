import { prisma } from '../../prisma';
import { Word, Definition, DefinitionTranslation } from '@prisma/client';

export type QuizCardData = {
  word: Word;
  definition: Definition & { translation: DefinitionTranslation | null };
};

export async function generateQuizCard(userId: number, excludeWordId?: number): Promise<QuizCardData | null> {
  const wordsWithDefs = await prisma.word.findMany({
    where: {
      userId,
      ...(excludeWordId ? { id: { not: excludeWordId } } : {}),
      definitions: {
        some: {} // Must have at least one definition
      }
    },
    select: { id: true }
  });

  if (wordsWithDefs.length === 0) {
    if (excludeWordId) {
      // Fallback to any word if no other words exist
      const fallback = await prisma.word.findMany({
        where: { userId, definitions: { some: {} } },
        select: { id: true }
      });
      if (fallback.length === 0) return null;
      wordsWithDefs.push(...fallback);
    } else {
      return null;
    }
  }

  const randomWordId = wordsWithDefs[Math.floor(Math.random() * wordsWithDefs.length)].id;

  const word = await prisma.word.findUnique({
    where: { id: randomWordId },
    include: {
      definitions: {
        include: {
          translation: true
        }
      }
    }
  });

  if (!word || word.definitions.length === 0) {
    return null;
  }

  const randomDef = word.definitions[Math.floor(Math.random() * word.definitions.length)];

  return {
    word: {
      id: word.id,
      text: word.text,
      userId: word.userId,
      createdAt: word.createdAt
    },
    definition: randomDef
  };
}

export async function getNextDefinition(wordId: number, currentDefinitionId: number): Promise<QuizCardData['definition'] | null> {
  const word = await prisma.word.findUnique({
    where: { id: wordId },
    include: {
      definitions: {
        include: { translation: true }
      }
    }
  });

  if (!word || word.definitions.length === 0) {
    return null;
  }

  const otherDefs = word.definitions.filter(d => d.id !== currentDefinitionId);
  const pool = otherDefs.length > 0 ? otherDefs : word.definitions; // Fallback to current if it's the only one
  
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function getQuizVariants(userId: number, currentWordId: number): Promise<string[]> {
  const incorrectWords = await prisma.word.findMany({
    where: {
      userId,
      id: { not: currentWordId }
    },
    select: { text: true }
  });

  const correctWord = await prisma.word.findUnique({
    where: { id: currentWordId },
    select: { text: true }
  });

  const pool = incorrectWords.map(w => w.text);
  
  // Shuffle incorrect words and take up to 4
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const variants = pool.slice(0, 4);

  // Add correct word
  if (correctWord) {
    variants.push(correctWord.text);
  }

  // Shuffle final variants
  for (let i = variants.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [variants[i], variants[j]] = [variants[j], variants[i]];
  }

  return variants;
}
