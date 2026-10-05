import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../app';
import { prisma } from '../prisma';
import type { TMessage } from '../types/message';
import { clearDatabase, setupMercureListener, setupTestUser, type TestSetup, teardownMercureListener } from './helpers';

describe('Words E2E', () => {
  const testUsername = 'words_user';
  let userToken: string;
  let setup: TestSetup;
  let reader: ReadableStreamDefaultReader<Uint8Array>;
  let messages: TMessage[] = [];
  let streamPromise: Promise<void>;

  beforeEach(async () => {
    await clearDatabase();
    
    setup = await setupTestUser(testUsername);
    userToken = setup.token;
    
    const sse = await setupMercureListener(testUsername);
    reader = sse.reader;
    messages = sse.messages;
    streamPromise = sse.streamPromise;


  });

  afterEach(async () => {
    await teardownMercureListener(reader, streamPromise);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should add words in a batch, report duplicates, publish updates, and delete a word', async () => {
    const originalFetch = global.fetch;
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url, options) => {
      const urlStr = url.toString();
      if (urlStr.includes('define')) {
        return new Response(JSON.stringify({ definitions: ['def1', 'def2'] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (urlStr.includes('translate')) {
        let textsCount = 1;
        if (options && typeof options.body === 'string') {
          try {
            const parsed = JSON.parse(options.body);
            if (Array.isArray(parsed.texts)) {
              textsCount = parsed.texts.length;
            }
          } catch {}
        }
        return new Response(JSON.stringify({ translations: Array.from({ length: textsCount }, () => 'mocked_translation') }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return originalFetch(url, options);
    });

    // 2. The UI submits words through the batch endpoint.
    const addWordSuccessRes = await request(app)
      .post('/api/v1/add_word/batch')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ words: ['apple'], dictionaryId: setup.dictionary.id });

    expect(addWordSuccessRes).toMatchObject({
      status: 200,
      body: {
        message: 'Words processed successfully',
        addedCount: 1,
        duplicateCount: 0,
      },
    });

    const waitForCondition = async (condition: () => boolean, timeout = 5000) => {
      const start = Date.now();
      while (!condition()) {
        if (Date.now() - start > timeout) {
          throw new Error('Timeout waiting for condition');
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    };

    await waitForCondition(() => 
      messages.some(m => m.type === 'definition_translate_loaded')
    );

    const createdWord = await prisma.word.findUnique({
      where: {
        dictionaryId_text: {
          dictionaryId: setup.dictionary.id,
          text: 'apple',
        },
      },
      include: {
        definitions: {
          include: { translation: true },
        },
      },
    });

    expect(createdWord).not.toBeNullable();
    if (!createdWord) throw new Error('Word not found');
    expect(createdWord.text).toBe('apple');
    expect(createdWord.definitions.length).toBe(2);
    expect(createdWord.definitions[0].translation?.text).toBe('mocked_translation');

    // 3. Duplicate word check uses the same batch contract as the UI.
    const duplicateAddRes = await request(app)
      .post('/api/v1/add_word/batch')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ words: ['Apple '], dictionaryId: setup.dictionary.id });

    expect(duplicateAddRes).toMatchObject({
      status: 200,
      body: {
        message: 'Words processed successfully',
        addedCount: 0,
        duplicateCount: 1,
      },
    });

    await waitForCondition(() => 
      messages.some(m => m.type === 'dictionary_add_duplicate')
    );
    
    // Verify Mercure events
    const processingEvents = messages.filter(m => m.type === 'dictionary_add_processing');
    expect(processingEvents.length).toBe(1);
    expect(processingEvents[0]).toMatchObject({
      type: 'dictionary_add_processing',
      words: expect.arrayContaining([
        expect.objectContaining({ word: 'apple' })
      ])
    });

    const defsReceivedEvents = messages.filter(m => m.type === 'dictionary_add_definitions_received');
    expect(defsReceivedEvents.length).toBe(1);
    expect(defsReceivedEvents[0]).toMatchObject({
      type: 'dictionary_add_definitions_received',
      words: expect.arrayContaining([
        expect.objectContaining({
          word: 'apple',
          definitions: expect.any(Array),
        })
      ]),
    });
    expect(defsReceivedEvents[0].words[0].definitions.length).toBe(2);

    const defProcessedEvents = messages.filter(m => m.type === 'definition_translate_loaded');
    expect(defProcessedEvents.length).toBe(1);
    expect(defProcessedEvents[0]).toMatchObject({
      type: 'definition_translate_loaded',
      words: expect.arrayContaining([
        expect.objectContaining({
          definitions: expect.arrayContaining([
            expect.objectContaining({ translation: 'mocked_translation' })
          ])
        })
      ])
    });
    expect(defProcessedEvents[0].words[0].definitions.length).toBe(2);

    const duplicateEvents = messages.filter(m => m.type === 'dictionary_add_duplicate');
    expect(duplicateEvents.length).toBe(1);
    expect(duplicateEvents[0]).toMatchObject({
      type: 'dictionary_add_duplicate',
      words: ['apple'],
    });

    // 4. Delete word
    const deleteRes = await request(app)
      .delete(`/api/v1/word_delete/${createdWord.id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(deleteRes).toMatchObject({
      status: 200,
      body: { message: 'Word deleted successfully' }
    });

    const deletedWord = await prisma.word.findUnique({
      where: { id: createdWord.id }
    });
    expect(deletedWord).toBeNull();

    fetchSpy.mockRestore();
  });
});
