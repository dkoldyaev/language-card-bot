import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../../prisma';
import { enqueueFetchTranslation } from './add_word.queue';
import { 
  DictionaryAddDefinitionsReceivedEvent
} from '../event_bus/event_bus.type';
import { publishEvent } from '../event_bus/event_bus.service';
import { env } from '../../core/env';
import { appEvents, Events } from '../../core/events';

const redisUrl = env.REDIS_URL;
export const workerConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

const DEFINER_API_URL = env.DEFINER_API_URL;
const TRANSLATOR_API_URL = env.TRANSLATOR_API_URL;

export const dictionaryWorker = new Worker('dictionaryQueue', async (job: Job) => {
  if (job.name === 'fetchDefinitions') {
    const { userId, username, wordId, wordText } = job.data;

    const word = await prisma.word.findUnique({
      where: { id: wordId },
      include: { dictionary: true }
    });

    if (!word || !word.dictionary) {
      console.error(`Word or dictionary not found for wordId ${wordId}`);
      return;
    }

    const { targetLanguage, baseLanguage } = word.dictionary;

    // 2. Fetch definitions from definer
    const definerRes = await fetch(DEFINER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: targetLanguage,
        text: wordText,
        definerApp: env.DEFINER_APP_TYPE
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
      wordId: wordId,
      word: wordText,
      definitions: createdDefinitions.map(d => ({ id: d.id, text: d.text }))
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
        definitions.length,
        targetLanguage,
        baseLanguage
      );
    }
  } else if (job.name === 'fetchTranslation') {
    const { definitionId, definitionText, userId, username, wordId, wordText, totalDefinitions, sourceLanguage, targetLanguage } = job.data;

    let srcLang = sourceLanguage;
    let tgtLang = targetLanguage;

    if (!srcLang || !tgtLang) {
      const definition = await prisma.definition.findUnique({
        where: { id: definitionId },
        include: {
          word: {
            include: { dictionary: true }
          }
        }
      });

      if (definition?.word?.dictionary) {
        srcLang = definition.word.dictionary.targetLanguage;
        tgtLang = definition.word.dictionary.baseLanguage;
      }
    }

    if (!srcLang || !tgtLang) {
      throw new Error(`Dictionary languages not found for definition ${definitionId}`);
    }

    const translatorRes = await fetch(TRANSLATOR_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceLanguage: srcLang,
        targetLanguage: tgtLang,
        text: definitionText,
        translatorApp: env.TRANSLATOR_APP_TYPE
      })
    });

    if (!translatorRes.ok) {
      throw new Error(`Translator API error for definition ${definitionId}: ${await translatorRes.text()}`);
    }

    const translatorData = (await translatorRes.json()) as { translatedText: string };
    const translatedText = translatorData.translatedText;

    // Save or update translation
    await prisma.definitionTranslation.upsert({
      where: { definitionId: definitionId },
      update: { text: translatedText },
      create: {
        text: translatedText,
        definitionId: definitionId
      }
    });

    appEvents.emit(Events.TRANSLATION_ADDED, {
      username,
      wordId,
      definitionId,
      translation: translatedText
    });
  }
}, { connection: workerConnection });

dictionaryWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} of type ${job?.name} failed with error ${err.message}`);
});
