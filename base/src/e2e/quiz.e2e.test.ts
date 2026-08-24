import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../prisma';
import { clearDatabase, setupTestUser, setupMercureListener, teardownMercureListener } from './helpers';
import { UserMode } from '@prisma/client';

describe('Quiz E2E', () => {
  const testUsername = 'quiz_user';
  let userToken: string;
  let userId: number;
  let reader: ReadableStreamDefaultReader<Uint8Array>;
  let messages: any[] = [];
  let streamPromise: Promise<void>;

  beforeEach(async () => {
    await clearDatabase();
    
    const setup = await setupTestUser(testUsername);
    userToken = setup.token;
    userId = setup.user.id;
    
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
      .set('Authorization', `Bearer ${userToken}`);

    expect(res).toMatchObject({
      status: 400,
      body: { error: 'Not enough words in dictionary to start quiz' }
    });
  });

  it('should start quiz successfully and send quiz_card event', async () => {
    // Add a word with definition and translation
    const word = await prisma.word.create({
      data: {
        userId,
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
      .set('Authorization', `Bearer ${userToken}`);

    expect(res).toMatchObject({
      status: 200,
      body: { message: 'Quiz started' }
    });

    // Check DB state
    const userState = await prisma.userState.findUnique({ where: { userId } });
    expect(userState).toMatchObject({
      mode: UserMode.QUIZ,
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
});
