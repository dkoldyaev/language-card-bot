import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import app from '../app';
import { prisma } from '../prisma';
import type { TMessage } from '../types/message';
import { clearDatabase, setupMercureListener, setupTestUser, teardownMercureListener } from './helpers';

describe('Quiz E2E', () => {
  const testUsername = 'quiz_user';
  let userToken: string;
  let userId: number;
  let dictionaryId: number;
  let reader: ReadableStreamDefaultReader<Uint8Array>;
  let messages: TMessage[] = [];
  let streamPromise: Promise<void>;

  beforeEach(async () => {
    await clearDatabase();
    
    const setup = await setupTestUser(testUsername);
    userToken = setup.token;
    userId = setup.user.id;
    dictionaryId = setup.dictionary.id;
    
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

  it('should fail to start quiz if dictionary is empty', async () => {
    const res = await request(app)
      .post('/api/v1/quiz/start')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ dictionaryId });

    expect(res).toMatchObject({
      status: 400,
      body: { error: 'Not enough words in dictionary to start quiz' }
    });
  });

  it('should start quiz successfully and send quiz_card event', async () => {
    // Add a word with definition and translation
    const word = await prisma.word.create({
      data: {
        dictionaryId,
        text: 'apple',
        definitions: {
          create: {
            text: 'a round fruit with red or green skin',
            translation: {
              create: {
                text: 'яблоко'
              }
            }
          }
        }
      },
      include: {
        definitions: {
          include: { translation: true }
        }
      }
    });

    const res = await request(app)
      .post('/api/v1/quiz/start')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ dictionaryId });

    expect(res).toMatchObject({
      status: 200,
      body: { message: 'Quiz started' }
    });

    // Check DB state
    const userState = await prisma.userState.findUnique({ where: { userId } });
    expect(userState).toMatchObject({
      showVariants: false,
      showDefinitionTranslation: false,
      currentWordId: word.id,
      currentDefinitionId: word.definitions[0].id
    });

    // Check Mercure Event
    await new Promise(resolve => setTimeout(resolve, 500));
    const event = messages.find(m => m.type === 'quiz_card');
    
    expect(event).toBeDefined();
    expect(event).toMatchObject({
      type: 'quiz_card',
      wordId: word.id,
      definition: {
        id: word.definitions[0].id,
        text: 'a round fruit with red or green skin',
        translation: 'яблоко'
      }
    });
  });

  it('should fetch variants successfully and update state', async () => {
    // Add multiple words
    const w1 = await prisma.word.create({ data: { dictionaryId, text: 'apple' } });
    await prisma.word.create({ data: { dictionaryId, text: 'banana' } });
    await prisma.word.create({ data: { dictionaryId, text: 'orange' } });

    await prisma.userState.update({
      where: { userId },
      data: { currentWordId: w1.id }
    });

    const res = await request(app)
      .post('/api/v1/quiz/variants')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ dictionaryId });

    expect(res.status).toBe(200);
    expect(res.body.variants.length).toBeGreaterThan(0);

    const userState = await prisma.userState.findUnique({ where: { userId } });
    expect(userState?.showVariants).toBe(true);

    await new Promise(resolve => setTimeout(resolve, 500));
    const event = messages.find(m => m.type === 'quiz_variants');
    expect(event).toBeDefined();
    expect(event.variants.length).toBeGreaterThan(0);
  });

  it('should fetch definition translation successfully and update state', async () => {
    const word = await prisma.word.create({
      data: {
        dictionaryId,
        text: 'apple',
        definitions: {
          create: {
            text: 'a fruit',
            translation: { create: { text: 'яблоко' } }
          }
        }
      },
      include: { definitions: true }
    });

    await prisma.userState.update({
      where: { userId },
      data: { currentDefinitionId: word.definitions[0].id }
    });

    const res = await request(app)
      .post('/api/v1/quiz/translate_definition')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ dictionaryId });

    expect(res.status).toBe(200);
    expect(res.body.translation).toBe('яблоко');

    const userState = await prisma.userState.findUnique({ where: { userId } });
    expect(userState?.showDefinitionTranslation).toBe(true);

    await new Promise(resolve => setTimeout(resolve, 500));
    const event = messages.find(m => m.type === 'quiz_definition_translation');
    expect(event).toBeDefined();
    expect(event.translation).toBe('яблоко');
  });

  it('should evaluate answers correctly and send event', async () => {
    const word = await prisma.word.create({ data: { dictionaryId, text: 'strawberry' } });

    await prisma.userState.update({
      where: { userId },
      data: { currentWordId: word.id }
    });

    const checkAnswer = async (suggestion: string, expectedResult: string) => {
      const res = await request(app)
        .post('/api/v1/quiz/answer')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ suggestion, dictionaryId });
      
      expect(res.status).toBe(200);
      expect(res.body.evaluation.result).toBe(expectedResult);

      // We might have multiple answer events in a row, let's just check the last one
      await new Promise(resolve => setTimeout(resolve, 500));
      const answerEvents = messages.filter(m => m.type === 'quiz_answer_evaluation');
      const lastEvent = answerEvents[answerEvents.length - 1];
      expect(lastEvent.result).toBe(expectedResult);
      expect(lastEvent.suggestion).toBe(suggestion);
    };

    await checkAnswer('strawberry', 'SUCCESS');
    await checkAnswer('strawbery', 'CLOSE_MATCH'); // 1 typo
    await checkAnswer('stabery', 'INCORRECT'); // 3 typos
  });

  it('should get next card', async () => {
    // Setup state and words
    const w1 = await prisma.word.create({ data: { dictionaryId, text: 'apple', definitions: { create: { text: 'a red fruit' } } }, include: { definitions: true } });
    const w2 = await prisma.word.create({ data: { dictionaryId, text: 'pear', definitions: { create: { text: 'a green fruit' } } } });

    await prisma.userState.update({
      where: { userId },
      data: { currentWordId: w1.id, currentDefinitionId: w1.definitions[0].id }
    });

    const res = await request(app)
      .post('/api/v1/quiz/next_card')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ dictionaryId });

    expect(res.status).toBe(200);
    expect(res.body.card.type).toBe('quiz_card');
    expect(res.body.card.wordId).toBe(w2.id); // since w1 is excluded

    const userState = await prisma.userState.findUnique({ where: { userId } });
    expect(userState?.showVariants).toBe(false);
    expect(userState?.showDefinitionTranslation).toBe(false);
    expect(userState?.currentWordId).toBe(w2.id);
  });

  it('should get next definition', async () => {
    // Create a word with 2 definitions
    const word = await prisma.word.create({ 
      data: { 
        dictionaryId, 
        text: 'pear', 
        definitions: { 
          create: [{ text: 'a green fruit' }, { text: 'a sweet fruit' }] 
        } 
      },
      include: { definitions: true } 
    });
    
    await prisma.userState.update({
      where: { userId },
      data: { currentWordId: word.id, currentDefinitionId: word.definitions[0].id }
    });

    const res = await request(app)
      .post('/api/v1/quiz/next_definition')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ dictionaryId });

    expect(res.status).toBe(200);
    expect(res.body.card.type).toBe('quiz_card');
    expect(res.body.card.definition.id).toBe(word.definitions[1].id); // since def 0 is excluded
    
    const userState = await prisma.userState.findUnique({ where: { userId } });
    expect(userState?.showVariants).toBe(false);
    expect(userState?.showDefinitionTranslation).toBe(false);
    expect(userState?.currentDefinitionId).toBe(word.definitions[1].id);
  });
});
