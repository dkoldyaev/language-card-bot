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

export async function enqueueFetchTranslation(
  definitionId: number,
  definitionText: string,
  userId: number,
  username: string,
  wordId: number,
  wordText: string,
  totalDefinitions: number,
  sourceLanguage?: string,
  targetLanguage?: string
) {
  await dictionaryQueue.add('fetchTranslation', {
    definitionId,
    definitionText,
    userId,
    username,
    wordId,
    wordText,
    totalDefinitions,
    sourceLanguage,
    targetLanguage,
  });
}
