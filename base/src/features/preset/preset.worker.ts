import { type Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../../core/env';
import { type GeneratePresetJobData, PRESET_QUEUE_NAME } from './preset.queue';
import { generatePreset } from './preset_generator.service';

const redisUrl = env.REDIS_URL;
export const presetWorkerConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

export const presetWorker = new Worker<GeneratePresetJobData>(
  PRESET_QUEUE_NAME,
  async (job: Job<GeneratePresetJobData>) => {
    const data = job.data;
    console.log(
      `[presetWorker] Starting job #${job.id} for language: "${data.language}"` +
        `${data.levels ? `, levels: "${data.levels.join(',')}"` : ''}` +
        `${data.theme ? `, theme: "${data.theme}"` : ''}` +
        ` (wordsCount: ${data.wordsCount ?? 100})...`
    );

    const result = await generatePreset({
      language: data.language,
      presetId: data.presetId,
      wordsCount: data.wordsCount,
      levels: data.levels,
      theme: data.theme,
      title: data.title,
      description: data.description,
      translationLanguages: data.translationLanguages,
      excludedWords: data.excludedWords ? new Set(data.excludedWords) : undefined,
      onProgress: (msg) => console.log(`[presetWorker job #${job.id}] ${msg}`),
    });

    console.log(`[presetWorker] Successfully completed job #${job.id}: Preset #${result.id} ("${result.title}").`);
    return { presetId: result.id, title: result.title };
  },
  {
    connection: presetWorkerConnection,
    concurrency: 1,
  }
);

presetWorker.on('failed', (job, err) => {
  console.error(
    `[presetWorker] Job #${job?.id} (attemptsMade: ${job?.attemptsMade}/${job?.opts.attempts}) failed with error:`,
    err
  );
});
