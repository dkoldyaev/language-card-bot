import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
export const queueConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

export const quizCleanupQueue = new Queue('quizCleanupQueue', { connection: queueConnection });

export async function enqueueQuizCleanup(username: string, delayMs = 2000) {
  await quizCleanupQueue.add('quizCleanup', { username }, { delay: delayMs });
}
