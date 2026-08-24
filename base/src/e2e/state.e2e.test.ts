import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../prisma';
import { clearDatabase, setupTestUser, setupMercureListener, teardownMercureListener } from './helpers';
import { UserMode } from '@prisma/client';

describe('State Sync E2E', () => {
  const testUsername = 'state_sync_user';
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

  it('should sync full user state including quiz fields', async () => {
    // Setup initial state in DB
    await prisma.userState.update({
      where: { userId },
      data: {
        mode: UserMode.QUIZ,
        showVariants: true,
        showDefinitionTranslation: false,
        currentDefinitionId: null
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
      mode: UserMode.QUIZ,
      showVariants: true,
      showDefinitionTranslation: false,
      currentDefinitionId: null
    });

    await new Promise(resolve => setTimeout(resolve, 500));
    
    const event = messages.find(m => m.type === 'state_sync' && m.mode === UserMode.QUIZ);
    expect(event).toMatchObject({
      type: 'state_sync',
      mode: UserMode.QUIZ,
      showVariants: true,
      showDefinitionTranslation: false,
      currentDefinitionId: null
    });
  });
});
