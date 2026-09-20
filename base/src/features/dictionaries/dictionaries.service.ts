import { prisma } from '../../prisma';
import type { LanguageCode } from '../../types/language';
import type { CreateDictionaryRequest, DictionaryItemDto, UpdateDictionaryRequest } from './dictionaries.type';

export async function ensureActiveDictionary(userId: number) {
  let userState = await prisma.userState.findUnique({
    where: { userId },
    include: { activeDictionary: true },
  });

  if (!userState) {
    userState = await prisma.userState.create({
      data: { userId },
      include: { activeDictionary: true },
    });
  }

  if (userState.activeDictionary && userState.activeDictionary.userId === userId) {
    return userState.activeDictionary;
  }

  // Look for any existing dictionary for user
  let dict = await prisma.dictionary.findFirst({
    where: { userId },
    orderBy: { id: 'asc' },
  });

  if (!dict) {
    dict = await prisma.dictionary.create({
      data: {
        userId,
        name: 'EN (RU)',
        targetLanguage: 'en',
        baseLanguage: 'ru',
      },
    });
  }

  await prisma.userState.update({
    where: { userId },
    data: { activeDictionaryId: dict.id },
  });

  return dict;
}

export async function getUserDictionaries(userId: number): Promise<{ dictionaries: DictionaryItemDto[]; activeDictionaryId: number | null }> {
  const activeDict = await ensureActiveDictionary(userId);
  const activeDictionaryId = activeDict?.id ?? null;

  const list = await prisma.dictionary.findMany({
    where: { userId },
    include: {
      _count: {
        select: { words: true },
      },
    },
    orderBy: { id: 'asc' },
  });

  const dictionaries: DictionaryItemDto[] = list.map((d) => ({
    id: d.id,
    name: d.name,
    targetLanguage: d.targetLanguage as LanguageCode,
    baseLanguage: d.baseLanguage as LanguageCode,
    wordCount: d._count.words,
    isActive: d.id === activeDictionaryId,
    createdAt: d.createdAt.toISOString(),
  }));

  return { dictionaries, activeDictionaryId };
}

export async function createDictionary(userId: number, data: CreateDictionaryRequest): Promise<DictionaryItemDto> {
  const name = data.name || `${data.targetLanguage.toUpperCase()} (${data.baseLanguage.toUpperCase()})`;

  const created = await prisma.dictionary.create({
    data: {
      userId,
      name,
      targetLanguage: data.targetLanguage.toLowerCase(),
      baseLanguage: data.baseLanguage.toLowerCase(),
    },
  });

  const userState = await prisma.userState.findUnique({ where: { userId } });
  const isFirst = !userState?.activeDictionaryId;

  if (isFirst) {
    await prisma.userState.upsert({
      where: { userId },
      update: { activeDictionaryId: created.id },
      create: { userId, activeDictionaryId: created.id },
    });
  }

  return {
    id: created.id,
    name: created.name,
    targetLanguage: created.targetLanguage as LanguageCode,
    baseLanguage: created.baseLanguage as LanguageCode,
    wordCount: 0,
    isActive: isFirst,
    createdAt: created.createdAt.toISOString(),
  };
}

export async function selectDictionary(userId: number, dictionaryId: number) {
  const dict = await prisma.dictionary.findFirst({
    where: { id: dictionaryId, userId },
  });

  if (!dict) {
    throw new Error('Dictionary not found');
  }

  await prisma.userState.upsert({
    where: { userId },
    update: {
      activeDictionaryId: dict.id,
      currentWordId: null,
      currentDefinitionId: null,
      showVariants: false,
      showDefinitionTranslation: false,
    },
    create: {
      userId,
      activeDictionaryId: dict.id,
    },
  });

  return dict;
}

export async function updateDictionary(userId: number, dictionaryId: number, data: UpdateDictionaryRequest) {
  const dict = await prisma.dictionary.findFirst({
    where: { id: dictionaryId, userId },
  });

  if (!dict) {
    throw new Error('Dictionary not found');
  }

  const updated = await prisma.dictionary.update({
    where: { id: dictionaryId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.targetLanguage && { targetLanguage: data.targetLanguage.toLowerCase() }),
      ...(data.baseLanguage && { baseLanguage: data.baseLanguage.toLowerCase() }),
    },
  });

  return updated;
}

export async function deleteDictionary(userId: number, dictionaryId: number) {
  const dict = await prisma.dictionary.findFirst({
    where: { id: dictionaryId, userId },
  });

  if (!dict) {
    throw new Error('Dictionary not found');
  }

  await prisma.dictionary.delete({
    where: { id: dictionaryId },
  });

  // If deleted dictionary was active, switch to another
  const userState = await prisma.userState.findUnique({ where: { userId } });
  if (userState?.activeDictionaryId === dictionaryId) {
    const nextDict = await prisma.dictionary.findFirst({
      where: { userId },
      orderBy: { id: 'asc' },
    });

    await prisma.userState.update({
      where: { userId },
      data: {
        activeDictionaryId: nextDict ? nextDict.id : null,
        currentWordId: null,
        currentDefinitionId: null,
        showVariants: false,
        showDefinitionTranslation: false,
      },
    });
  }
}
