import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import app from '../app';
import { prisma } from '../prisma';
import type { TMessage } from '../types/message';
import { clearDatabase, setupMercureListener, setupTestUser, teardownMercureListener } from './helpers';

describe('State Sync E2E', () => {
  const testUsername = 'state_sync_user';
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

  it('should sync full user state including quiz fields', async () => {
    const word = await prisma.word.create({
      data: {
        dictionaryId,
        text: 'test_word',
        definitions: {
          create: {
            text: 'test_definition',
            translation: {
              create: {
                text: 'test_translation'
              }
            }
          }
        }
      },
      include: { definitions: true }
    });

    // Setup initial state in DB
    await prisma.userState.update({
      where: { userId },
      data: {
        showVariants: true,
        showDefinitionTranslation: false,
        currentWordId: word.id,
        currentDefinitionId: word.definitions[0].id
      }
    });

    const res = await request(app)
      .post('/api/v1/state/sync')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res).toMatchObject({
      status: 200,
      body: { message: 'State synced to Mercure' }
    });

    expect(res.body.state).toMatchObject({
      type: 'state_sync',
      showVariants: true,
      showDefinitionTranslation: false,
      currentWordId: word.id,
      currentDefinitionId: word.definitions[0].id,
      currentWord: {
        id: word.id,
        text: 'test_word'
      },
      currentDefinition: {
        id: word.definitions[0].id,
        text: 'test_definition',
        translation: 'test_translation'
      }
    });

    await new Promise(resolve => setTimeout(resolve, 500));
    
    const event = messages.find(m => m.type === 'state_sync');
    expect(event).toMatchObject({
      type: 'state_sync',
      showVariants: true,
      showDefinitionTranslation: false,
      currentWordId: word.id,
      currentDefinitionId: word.definitions[0].id,
      currentWord: {
        id: word.id,
        text: 'test_word'
      },
      currentDefinition: {
        id: word.definitions[0].id,
        text: 'test_definition',
        translation: 'test_translation'
      }
    });
  });
});
