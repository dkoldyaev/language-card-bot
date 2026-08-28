import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../prisma';
import { clearDatabase, setupTestUser, setupMercureListener, teardownMercureListener } from './helpers';
describe('Dictionary E2E', () => {
  const testUsername = 'dict_user';
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
  });

  afterEach(async () => {
    await teardownMercureListener(reader, streamPromise);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });


  it('should fetch the dictionary', async () => {
    // Add some dictionary data
    const user = await prisma.user.findUnique({ where: { username: testUsername } });
    const word = await prisma.word.create({
      data: {
        userId: user!.id,
        text: 'hello',
        definitions: {
          create: {
            text: 'A greeting',
            translation: {
              create: {
                text: 'Привет'
              }
            }
          }
        }
      }
    });

    const res = await request(app)
      .get('/api/v1/dictionary')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res).toMatchObject({
      status: 200,
      body: {
        dictionary: [
          {
            text: 'hello',
            definitions: [
              {
                text: 'A greeting',
                translation: {
                  text: 'Привет'
                }
              }
            ]
          }
        ]
      }
    });
  });
});
