import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../../core/env';

const redisUrl = env.REDIS_URL;
export const queueConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

export const quizCleanupQueue = new Queue('quizCleanupQueue', { connection: queueConnection });

export async function enqueueQuizCleanup(username: string, delayMs = 2000) {
  await quizCleanupQueue.add('quizCleanup', { username }, { delay: delayMs });
}
