import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../prisma';
import { clearDatabase, setupTestUser, setupMercureListener, teardownMercureListener } from './helpers';
import { UserMode } from '@prisma/client';

describe('Dictionary Modes E2E', () => {
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

  it('should switch to dictionary view', async () => {
    const res = await request(app)
      .post('/api/v1/switch_mode_dictionary_view')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res).toMatchObject({
      status: 200,
      body: { message: 'Switched to dictionary view' }
    });

    await new Promise(resolve => setTimeout(resolve, 500));
    
    const event = messages.find(m => m.type === 'state_sync' && m.mode === UserMode.DICTIONARY_VIEW);
    expect(event).toMatchObject({
      type: 'state_sync',
      mode: UserMode.DICTIONARY_VIEW
    });

    const userInDb = await prisma.user.findUnique({
      where: { username: testUsername },
      include: { state: true }
    });
    
    expect(userInDb).toBeDefined();
    expect(userInDb?.state?.mode).toBe(UserMode.DICTIONARY_VIEW);
  });

  it('should switch to dictionary add view', async () => {
    const res = await request(app)
      .post('/api/v1/switch_mode_dictionary_add')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res).toMatchObject({
      status: 200,
      body: { message: 'Switched to dictionary add view' }
    });

    await new Promise(resolve => setTimeout(resolve, 500));
    const event = messages.find(m => m.type === 'state_sync' && m.mode === UserMode.DICTIONARY_ADD);
    expect(event).toMatchObject({
      type: 'state_sync',
      mode: UserMode.DICTIONARY_ADD
    });

    const userInDb = await prisma.user.findUnique({
      where: { username: testUsername },
      include: { state: true }
    });
    
    expect(userInDb).toBeDefined();
    expect(userInDb?.state?.mode).toBe(UserMode.DICTIONARY_ADD);
  });

  it('should switch to dictionary edit view', async () => {
    const res = await request(app)
      .post('/api/v1/switch_mode_dictionary_edit')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res).toMatchObject({
      status: 200,
      body: { message: 'Switched to dictionary edit view' }
    });

    await new Promise(resolve => setTimeout(resolve, 500));
    const event = messages.find(m => m.type === 'state_sync' && m.mode === UserMode.EDITING_DICTIONARY);
    expect(event).toMatchObject({
      type: 'state_sync',
      mode: UserMode.EDITING_DICTIONARY
    });

    const userInDb = await prisma.user.findUnique({
      where: { username: testUsername },
      include: { state: true }
    });
    
    expect(userInDb).toBeDefined();
    expect(userInDb?.state?.mode).toBe(UserMode.EDITING_DICTIONARY);
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
