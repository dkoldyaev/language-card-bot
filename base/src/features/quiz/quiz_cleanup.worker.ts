import { type Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../../core/env';
import { publishEvent } from '../event_bus/event_bus.service';
import type { QuizCleanupMercureEvent } from '../event_bus/event_bus.type';

const redisUrl = env.REDIS_URL;
export const workerConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

export const quizCleanupWorker = new Worker('quizCleanupQueue', async (job: Job) => {
  if (job.name === 'quizCleanup') {
    const { username } = job.data;

    const event: QuizCleanupMercureEvent = {
      version: 'v1',
      type: 'quiz_cleanup'
    };

    await publishEvent(username, event);
  }
}, { connection: workerConnection });

quizCleanupWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} of type ${job?.name} failed with error ${err.message}`);
});
