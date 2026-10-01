import { type Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../../core/env';
import { appEvents, Events } from '../../core/events';
import { processDefinitionImage } from './image.service';

const redisUrl = env.REDIS_URL;
export const imageWorkerConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

export const imageWorker = new Worker(
  'imageQueue',
  async (job: Job) => {
    if (job.name === 'fetchImages') {
      const { definitionId, definitionText, username, wordId } = job.data;
      const attachedImages = await processDefinitionImage(definitionId, definitionText);

      if (attachedImages.length > 0) {
        appEvents.emit(Events.IMAGE_ADDED, {
          username,
          wordId,
          definitions: [
            {
              id: definitionId,
              images: attachedImages.map((img) => ({
                id: img.id,
                url: img.url,
                source: img.source,
              })),
            },
          ],
        });
      }
    }
  },
  { connection: imageWorkerConnection }
);

imageWorker.on('failed', (job, err) => {
  console.error(`Image worker job ${job?.id} failed with error:`, err);
});
