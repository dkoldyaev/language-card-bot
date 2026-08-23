import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../prisma';
import { clearDatabase, setupTestUser, setupMercureListener, teardownMercureListener } from './helpers';

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

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Switched to dictionary view');

    await new Promise(resolve => setTimeout(resolve, 500));
    
    const event = messages.find(m => m.type === 'state_sync' && m.mode === 'DICTIONARY_VIEW');
    expect(event).toBeDefined();

    const userInDb = await prisma.user.findUnique({
      where: { username: testUsername },
      include: { state: true }
    });
    
    expect(userInDb).toBeDefined();
    expect(userInDb?.state?.mode).toBe('DICTIONARY_VIEW');
  });

  it('should switch to dictionary add view', async () => {
    const res = await request(app)
      .post('/api/v1/switch_mode_dictionary_add')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Switched to dictionary add view');

    await new Promise(resolve => setTimeout(resolve, 500));
    const event = messages.find(m => m.type === 'state_sync' && m.mode === 'DICTIONARY_ADD');
    expect(event).toBeDefined();

    const userInDb = await prisma.user.findUnique({
      where: { username: testUsername },
      include: { state: true }
    });
    
    expect(userInDb).toBeDefined();
    expect(userInDb?.state?.mode).toBe('DICTIONARY_ADD');
  });

  it('should switch to dictionary edit view', async () => {
    const res = await request(app)
      .post('/api/v1/switch_mode_dictionary_edit')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Switched to dictionary edit view');

    await new Promise(resolve => setTimeout(resolve, 500));
    const event = messages.find(m => m.type === 'state_sync' && m.mode === 'EDITING_DICTIONARY');
    expect(event).toBeDefined();

    const userInDb = await prisma.user.findUnique({
      where: { username: testUsername },
      include: { state: true }
    });
    
    expect(userInDb).toBeDefined();
    expect(userInDb?.state?.mode).toBe('EDITING_DICTIONARY');
  });
});
