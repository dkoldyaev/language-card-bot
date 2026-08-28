import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../prisma';
import { clearDatabase, setupTestUser, setupMercureListener, teardownMercureListener } from './helpers';

describe('Words E2E', () => {
  const testUsername = 'words_user';
  let userToken: string;
  let reader: ReadableStreamDefaultReader<Uint8Array>;
  let messages: any[] = [];
  let streamPromise: Promise<void>;

  beforeEach(async () => {
    await clearDatabase();
    
    const setup = await setupTestUser(testUsername);
    userToken = setup.token;
    
    const sse = await setupMercureListener(testUsername);
    reader = sse.reader;
    messages = sse.messages;
    streamPromise = sse.streamPromise;

    // Initialize user settings which are required for translations
    await request(app)
      .get('/api/v1/settings')
      .set('Authorization', `Bearer ${userToken}`);
  });

  afterEach(async () => {
    await teardownMercureListener(reader, streamPromise);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should handle add_word flows and word deletion correctly', async () => {
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
        return new Response(JSON.stringify({ translatedText: 'mocked_translation' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return originalFetch(url, options);
    });

    // 2. Successfully adds word
    const addWordSuccessRes = await request(app)
      .post('/api/v1/add_word')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ word: 'apple' });

    expect(addWordSuccessRes).toMatchObject({
      status: 200,
      body: { message: 'Word added successfully' }
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
      messages.filter(m => m.type === 'definition_translate_loaded').length >= 2
    );

    const userInDbAfterAdd = await prisma.user.findUnique({
      where: { username: testUsername },
    });

    const createdWord = await prisma.word.findUnique({
      where: { userId_text: { userId: userInDbAfterAdd!.id, text: 'apple' } },
      include: {
        definitions: {
          include: { translation: true }
        }
      }
    });

    expect(createdWord).toBeDefined();
    expect(createdWord?.text).toBe('apple');
    expect(createdWord?.definitions.length).toBe(2);
    expect(createdWord?.definitions[0].translation?.text).toBe('mocked_translation');

    // 3. Duplicate word check
    const duplicateAddRes = await request(app)
      .post('/api/v1/add_word')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ word: 'Apple ' });

    expect(duplicateAddRes).toMatchObject({
      status: 200,
      body: { message: 'Word already exists' }
    });

    await waitForCondition(() => 
      messages.some(m => m.type === 'dictionary_add_duplicate')
    );
    
    // Verify Mercure events
    const processingEvents = messages.filter(m => m.type === 'dictionary_add_processing');
    expect(processingEvents.length).toBe(1);
    expect(processingEvents[0]).toMatchObject({
      type: 'dictionary_add_processing',
      word: 'apple'
    });

    const defsReceivedEvents = messages.filter(m => m.type === 'dictionary_add_definitions_received');
    expect(defsReceivedEvents.length).toBe(1);
    expect(defsReceivedEvents[0]).toMatchObject({
      type: 'dictionary_add_definitions_received',
      definitionsCount: 2
    });

    const defProcessedEvents = messages.filter(m => m.type === 'definition_translate_loaded');
    expect(defProcessedEvents.length).toBe(2);
    expect(defProcessedEvents[0]).toMatchObject({
      type: 'definition_translate_loaded',
      translation: 'mocked_translation'
    });

    const duplicateEvents = messages.filter(m => m.type === 'dictionary_add_duplicate');
    expect(duplicateEvents.length).toBe(1);
    expect(duplicateEvents[0]).toMatchObject({
      type: 'dictionary_add_duplicate',
      word: 'apple',
      definitionsCount: 2
    });

    // 4. Delete word
    const deleteRes = await request(app)
      .delete(`/api/v1/word_delete/${createdWord!.id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(deleteRes).toMatchObject({
      status: 200,
      body: { message: 'Word deleted successfully' }
    });

    const deletedWord = await prisma.word.findUnique({
      where: { id: createdWord!.id }
    });
    expect(deletedWord).toBeNull();

    fetchSpy.mockRestore();
  });
});
