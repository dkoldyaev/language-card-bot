import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../../prisma';
import { enqueueFetchTranslation } from './add_word.queue';
import { 
  DictionaryAddProcessingEvent, 
  DictionaryAddDefinitionsReceivedEvent, 
  DictionaryAddDefinitionProcessedEvent 
} from '../../types/mercure.type';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
export const workerConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

const MERCURE_URL = process.env.MERCURE_URL!;
const MERCURE_JWT = process.env.MERCURE_JWT!;
const BASE_DOMAIN = process.env.BASE_DOMAIN;
const DEFINER_API_URL = process.env.DEFINER_API_URL!;
const TRANSLATOR_API_URL = process.env.TRANSLATOR_API_URL!;

async function publishEvent(username: string, payload: any) {
  const topic = `${BASE_DOMAIN}/v1/users/${username}`;
  const body = new URLSearchParams({
    topic,
    data: JSON.stringify(payload)
  });

  try {
    const res = await fetch(MERCURE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MERCURE_JWT}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });
    if (!res.ok) {
      console.error('Failed to publish to Mercure:', await res.text());
    }
  } catch (e) {
    console.error('Mercure publish error:', e);
  }
}

export const dictionaryWorker = new Worker('dictionaryQueue', async (job: Job) => {
  if (job.name === 'fetchDefinitions') {
    const { userId, username, wordId, wordText } = job.data;

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId }
    });

    if (!userSettings) {
      console.error(`User settings not found for user ${userId}`);
      return;
    }

    // 1. Send "processing" event
    await publishEvent(username, {
      version: 'v1',
      type: 'dictionary_add_processing',
      word: wordText
    } as DictionaryAddProcessingEvent);

    // 2. Fetch definitions from definer
    const definerRes = await fetch(DEFINER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: userSettings.targetLanguage,
        text: wordText,
        definerApp: 'mock' // or whatever
      })
    });

    if (!definerRes.ok) {
      throw new Error(`Definer API error: ${await definerRes.text()}`);
    }

    const definerData = (await definerRes.json()) as { definitions: string[] };
    const definitions = definerData.definitions;

    if (!definitions || definitions.length === 0) {
      return;
    }

    // Save definitions
    const createdDefinitions = await Promise.all(
      definitions.map((defText: string) => 
        prisma.definition.create({
          data: {
            text: defText,
            wordId: wordId
          }
        })
      )
    );

    // 3. Send "definitions received" event
    await publishEvent(username, {
      version: 'v1',
      type: 'dictionary_add_definitions_received',
      word: wordText,
      definitionsCount: definitions.length
    } as DictionaryAddDefinitionsReceivedEvent);

    // 4. Enqueue translation jobs
    for (const definition of createdDefinitions) {
      await enqueueFetchTranslation(
        definition.id,
        definition.text,
        userId,
        username,
        wordId,
        wordText,
        definitions.length
      );
    }
  } else if (job.name === 'fetchTranslation') {
    const { definitionId, definitionText, userId, username, wordId, wordText, totalDefinitions } = job.data;

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId }
    });

    if (!userSettings) {
      throw new Error(`User settings not found for user ${userId}`);
    }

    const translatorRes = await fetch(TRANSLATOR_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceLanguage: userSettings.targetLanguage,
        targetLanguage: userSettings.baseLanguage,
        text: definitionText,
        translatorApp: 'mock'
      })
    });

    if (!translatorRes.ok) {
      throw new Error(`Translator API error for definition ${definitionId}: ${await translatorRes.text()}`);
    }

    const translatorData = (await translatorRes.json()) as { translatedText: string };
    const translatedText = translatorData.translatedText;

    // Save translation
    await prisma.definitionTranslation.create({
      data: {
        text: translatedText,
        definitionId: definitionId
      }
    });

    // Count how many translations exist for this word so far
    const processedCount = await prisma.definitionTranslation.count({
      where: {
        definition: {
          wordId: wordId
        }
      }
    });

    // 5. Send "definition processed" event
    await publishEvent(username, {
      version: 'v1',
      type: 'dictionary_add_definition_processed',
      word: wordText,
      processedCount: processedCount,
      totalDefinitions: totalDefinitions
    } as DictionaryAddDefinitionProcessedEvent);
  }
}, { connection: workerConnection });

dictionaryWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} of type ${job?.name} failed with error ${err.message}`);
});
