import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
export const queueConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

export const dictionaryQueue = new Queue('dictionaryQueue', { connection: queueConnection });

export async function enqueueFetchDefinitions(userId: number, username: string, wordId: number, wordText: string) {
  await dictionaryQueue.add('fetchDefinitions', {
    userId,
    username,
    wordId,
    wordText
  });
}

export async function enqueueFetchTranslation(
  definitionId: number,
  definitionText: string,
  userId: number,
  username: string,
  wordId: number,
  wordText: string,
  totalDefinitions: number
) {
  await dictionaryQueue.add('fetchTranslation', {
    definitionId,
    definitionText,
    userId,
    username,
    wordId,
    wordText,
    totalDefinitions
  });
}
