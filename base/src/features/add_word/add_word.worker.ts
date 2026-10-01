
import { type Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../../core/env';
import { appEvents, Events } from '../../core/events';
import { prisma } from '../../prisma';
import { type LanguageCode, SUPPORTED_LANGUAGES } from '../../types/language';
import { publishEvent } from '../event_bus/event_bus.service';
import type {
  DictionaryAddDefinitionsReceivedEvent
} from '../event_bus/event_bus.type';
import { enqueueFetchTranslations } from './add_word.queue';
import { enqueueFetchImages } from '../image/image.queue';

interface DefinerWorkerResponse {
  definitions: Array<string | { text: string }>;
}

interface TranslatorWorkerResponse {
  translations: string[];
}

function toLanguageCode(lang: string): LanguageCode | undefined {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lang)
    ? (lang as LanguageCode)
    : undefined;
}

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

    if (!word?.dictionary) {
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

    const definerData = (await definerRes.json()) as DefinerWorkerResponse;
    const definitions = definerData.definitions;

    if (!definitions || definitions.length === 0) {
      return;
    }

    // Save definitions
    const createdDefinitions = await prisma.definition.createManyAndReturn({
      data: definitions.map((def: string | { text: string }) => ({
        text: typeof def === 'string' ? def : def.text,
        wordId: wordId,
      })),
      select: {
        id: true,
        text: true,
      },
    });

    // 3. Send "definitions received" event
    const definitionsReceivedEvent: DictionaryAddDefinitionsReceivedEvent = {
      version: 'v1',
      type: 'dictionary_add_definitions_received',
      words: [
        {
          wordId: wordId,
          word: wordText,
          definitions: createdDefinitions.map(d => ({ id: d.id, text: d.text }))
        }
      ]
    };
    await publishEvent(username, definitionsReceivedEvent);

    // 4. Enqueue translation job for all definitions of this word
    await enqueueFetchTranslations(
      createdDefinitions.map(d => ({ id: d.id, text: d.text })),
      userId,
      username,
      wordId,
      wordText,
      toLanguageCode(baseLanguage),
      toLanguageCode(targetLanguage),
    );

    // 5. Enqueue image generation jobs for all definitions of this word
    await enqueueFetchImages(
      createdDefinitions.map((d) => ({
        definitionId: d.id,
        definitionText: d.text,
        username,
        wordId,
        wordText,
      }))
    );
  } else if (job.name === 'fetchTranslations' || job.name === 'fetchTranslation') {
    const { definitions, definitionId, definitionText, username, wordId, sourceLanguage, targetLanguage } = job.data;

    const defsToTranslate: { id: number; text: string }[] = Array.isArray(definitions)
      ? definitions
      : (definitionId && definitionText ? [{ id: definitionId, text: definitionText }] : []);

    if (defsToTranslate.length === 0) {
      return;
    }

    let srcLang = sourceLanguage;
    let tgtLang = targetLanguage;

    if (!srcLang || !tgtLang) {
      const word = await prisma.word.findUnique({
        where: { id: wordId },
        include: { dictionary: true }
      });

      if (word?.dictionary) {
        srcLang = word.dictionary.targetLanguage;
        tgtLang = word.dictionary.baseLanguage;
      }
    }

    if (!srcLang || !tgtLang) {
      throw new Error(`Dictionary languages not found for word ${wordId}`);
    }

    const translatorRes = await fetch(TRANSLATOR_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceLanguage: srcLang,
        targetLanguage: tgtLang,
        texts: defsToTranslate.map(d => d.text),
        translatorApp: env.TRANSLATOR_APP_TYPE
      })
    });

    if (!translatorRes.ok) {
      throw new Error(`Translator API error for word ${wordId}: ${await translatorRes.text()}`);
    }

    const translatorData = (await translatorRes.json()) as TranslatorWorkerResponse;
    const translatedTexts = translatorData.translations;

    if (!Array.isArray(translatedTexts) || translatedTexts.length !== defsToTranslate.length) {
      throw new Error(`Translator API returned mismatched translations count: expected ${defsToTranslate.length}, got ${translatedTexts?.length}`);
    }

    // Save translations (batch upsert via transaction)
    await prisma.$transaction(
      defsToTranslate.map((def, i) => {
        const translatedText = translatedTexts[i];
        if (typeof translatedText !== 'string') {
          throw new Error(`Invalid translation received for definition ${def.id}`);
        }
        return prisma.definitionTranslation.upsert({
          where: { definitionId: def.id },
          update: { text: translatedText },
          create: { definitionId: def.id, text: translatedText },
        });
      })
    );

    const savedTranslations: { id: number; translation: string }[] = defsToTranslate.map((def, i) => ({
      id: def.id,
      translation: translatedTexts[i],
    }));

    appEvents.emit(Events.TRANSLATION_ADDED, {
      username,
      wordId,
      definitions: savedTranslations
    });
  }
}, { connection: workerConnection });

dictionaryWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} of type ${job?.name} failed with error ${err.message}`);
});
