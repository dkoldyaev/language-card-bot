import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../../core/env';

const redisUrl = env.REDIS_URL;
export const queueConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

export const dictionaryQueue = new Queue('dictionaryQueue', { connection: queueConnection });

export async function enqueueFetchDefinitions(
  userId: number,
  username: string,
  wordId: number,
  wordText: string,
  dictionaryId?: number
) {
  await dictionaryQueue.add('fetchDefinitions', {
    userId,
    username,
    wordId,
    wordText,
    dictionaryId,
  });
}

export interface FetchTranslationDefinitionItem {
  id: number;
  text: string;
}

export async function enqueueFetchTranslations(
  definitions: FetchTranslationDefinitionItem[],
  userId: number,
  username: string,
  wordId: number,
  wordText: string,
  sourceLanguage?: string,
  targetLanguage?: string
) {
  await dictionaryQueue.add('fetchTranslations', {
    definitions,
    userId,
    username,
    wordId,
    wordText,
    sourceLanguage,
    targetLanguage,
  });
}
