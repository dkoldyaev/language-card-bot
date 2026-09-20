import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import app from '../app';
import { prisma } from '../prisma';
import { clearDatabase, setupMercureListener, setupTestUser, type TestSetup, teardownMercureListener } from './helpers';

describe('Dictionary E2E', () => {
  const testUsername = 'dict_user';
  let userToken: string;
  let setup: TestSetup;
  let reader: ReadableStreamDefaultReader<Uint8Array>;
  let streamPromise: Promise<void>;

  beforeEach(async () => {
    await clearDatabase();
    
    setup = await setupTestUser(testUsername);
    userToken = setup.token;
    
    const sse = await setupMercureListener(testUsername);
    reader = sse.reader;
    streamPromise = sse.streamPromise;
  });

  afterEach(async () => {
    await teardownMercureListener(reader, streamPromise);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });


  it('should fetch the dictionary', async () => {
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
