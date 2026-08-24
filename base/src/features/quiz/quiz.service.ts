import { prisma } from '../../prisma';
import { Word, Definition, DefinitionTranslation } from '@prisma/client';

export type QuizCardData = {
  word: Word;
  definition: Definition & { translation: DefinitionTranslation | null };
};

export async function generateQuizCard(userId: number): Promise<QuizCardData | null> {
  const wordsWithDefs = await prisma.word.findMany({
    where: {
      userId,
      definitions: {
        some: {} // Must have at least one definition
      }
    },
    select: { id: true }
  });

  if (wordsWithDefs.length === 0) {
    return null;
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

export async function getQuizVariants(userId: number, currentWordId: number): Promise<{ id: number; text: string }[]> {
  const incorrectWords = await prisma.word.findMany({
    where: {
      userId,
      id: { not: currentWordId }
    },
    select: { id: true, text: true }
  });

  for (let i = incorrectWords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [incorrectWords[i], incorrectWords[j]] = [incorrectWords[j], incorrectWords[i]];
  }

  return incorrectWords.slice(0, 5);
}
