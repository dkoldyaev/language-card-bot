import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import app from '../app';
import { prisma } from '../prisma';
import type { TMessage } from '../types/message';
import { clearDatabase, setupMercureListener, setupTestUser, teardownMercureListener } from './helpers';

describe('Echo E2E', () => {
  const testUsername = 'echo_user';
  let userToken: string;
  let reader: ReadableStreamDefaultReader<Uint8Array>;
  let messages: TMessage[] = [];
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

  it('should process echo request and receive SSE message', async () => {
    const echoPayload = { message: 'Hello from e2e!' };
    const echoRes = await request(app)
      .post('/api/v1/echo')
      .set('Authorization', `Bearer ${userToken}`)
      .send(echoPayload);

    expect(echoRes).toMatchObject({
      status: 200,
      body: {
        message: 'Echo successful',
        data: echoPayload
      }
    });

    // Даем время на доставку сообщения Echo
    await new Promise(resolve => setTimeout(resolve, 500));
    const echoEvent = messages.find(m => m.type === 'echo');
    expect(echoEvent).toMatchObject({
      type: 'echo',
      data: echoPayload
    });
  });
});
