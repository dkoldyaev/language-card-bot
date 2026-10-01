import type { PrismaClient } from '@prisma/client';
import type { Job } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type mockDeep, mockReset } from 'vitest-mock-extended';
import { prisma } from '../../prisma';
import * as eventBusService from '../event_bus/event_bus.service';
import * as imageQueue from '../image/image.queue';
import * as addWordQueue from './add_word.queue';
import { dictionaryWorker } from './add_word.worker';

vi.mock('../../prisma');
vi.mock('../event_bus/event_bus.service', () => ({
  publishEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../image/image.queue', () => ({
  enqueueFetchImages: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./add_word.queue', () => ({
  enqueueFetchTranslations: vi.fn().mockResolvedValue(undefined),
}));

const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('dictionaryWorker - add_word job handling', () => {
  beforeEach(() => {
    mockReset(prismaMock);
    vi.clearAllMocks();
  });

  it('enqueues both translation and image generation jobs when fetchDefinitions succeeds', async () => {
    prismaMock.word.findUnique.mockResolvedValue({
      id: 10,
      text: 'apple',
      dictionary: {
        id: 1,
        targetLanguage: 'en',
        baseLanguage: 'ru',
      },
    } as any);

    // Mock definer fetch API
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        definitions: [
          { text: 'a round edible fruit produced by an apple tree' },
          { text: 'the tree that bears apple fruit' },
        ],
      }),
    } as any);

    prismaMock.definition.createManyAndReturn.mockResolvedValue([
      { id: 101, text: 'a round edible fruit produced by an apple tree', wordId: 10 },
      { id: 102, text: 'the tree that bears apple fruit', wordId: 10 },
    ] as any);

    const job = {
      name: 'fetchDefinitions',
      data: {
        userId: 5,
        username: 'john',
        wordId: 10,
        wordText: 'apple',
      },
    } as unknown as Job;

    // Execute the worker process function
    const processFn = (dictionaryWorker as any).processFn;
    await processFn(job);

    // 1. Translations enqueued
    expect(addWordQueue.enqueueFetchTranslations).toHaveBeenCalledTimes(1);
    expect(addWordQueue.enqueueFetchTranslations).toHaveBeenCalledWith(
      [
        { id: 101, text: 'a round edible fruit produced by an apple tree' },
        { id: 102, text: 'the tree that bears apple fruit' },
      ],
      5,
      'john',
      10,
      'apple',
      'ru',
      'en'
    );

    // 2. Images enqueued for all created definitions
    expect(imageQueue.enqueueFetchImages).toHaveBeenCalledTimes(1);
    expect(imageQueue.enqueueFetchImages).toHaveBeenCalledWith([
      {
        definitionId: 101,
        definitionText: 'a round edible fruit produced by an apple tree',
        username: 'john',
        wordId: 10,
        wordText: 'apple',
      },
      {
        definitionId: 102,
        definitionText: 'the tree that bears apple fruit',
        username: 'john',
        wordId: 10,
        wordText: 'apple',
      },
    ]);
  });
});
