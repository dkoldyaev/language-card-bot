import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../../core/env';
import type { GeneratePresetOptions } from './preset_generator.service';

const redisUrl = env.REDIS_URL;
export const presetQueueConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

export const PRESET_QUEUE_NAME = 'presetQueue';

export const presetQueue = new Queue<GeneratePresetJobData>(PRESET_QUEUE_NAME, {
  connection: presetQueueConnection,
});

export interface GeneratePresetJobData {
  language: GeneratePresetOptions['language'];
  presetId?: number;
  wordsCount?: number;
  levels?: string[];
  theme?: string;
  title?: string;
  description?: string;
  translationLanguages?: string[];
  excludedWords?: string[];
}

export async function enqueueGeneratePreset(data: GeneratePresetJobData) {
  return await presetQueue.add('generatePreset', data, {
    attempts: 10,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 24 * 3600,
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600,
    },
  });
}
