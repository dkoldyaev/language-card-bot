import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../../core/env';

const redisUrl = env.REDIS_URL;
export const imageQueueConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

export const imageQueue = new Queue('imageQueue', { connection: imageQueueConnection });

export interface FetchImagesJobData {
  definitionId: number;
  definitionText: string;
  userId: number;
  username?: string;
  wordId?: number;
  wordText?: string;
}

export async function enqueueFetchImages(items: FetchImagesJobData[]) {
  if (items.length === 0) return;
  await imageQueue.addBulk(
    items.map((item) => ({
      name: 'fetchImages',
      data: item,
      opts: {
        jobId: `fetch-images-${item.definitionId}`,
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    }))
  );
}
