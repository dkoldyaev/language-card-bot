import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import app from '../app';
import { prisma } from '../prisma';
import type { TMessage } from '../types/message';
import { clearDatabase, setupMercureListener, setupTestUser, teardownMercureListener } from './helpers';

describe('Settings E2E', () => {
  const testUsername = 'settings_user';
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

  it('should retrieve and update user settings', async () => {
    // Получение настроек (создание по умолчанию)
    const getSettingsRes = await request(app)
      .get('/api/v1/settings')
      .set('Authorization', `Bearer ${userToken}`);
      
    expect(getSettingsRes).toMatchObject({
      status: 200,
      body: {
        settings: {
          baseLanguage: 'ru',
          targetLanguage: 'en'
        }
      }
    });

    // Изменение настроек
    const postSettingsRes = await request(app)
      .post('/api/v1/settings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        baseLanguage: 'en',
        targetLanguage: 'de'
      });

    expect(postSettingsRes).toMatchObject({
      status: 200,
      body: {
        settings: {
          baseLanguage: 'en',
          targetLanguage: 'de'
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 500));
    
    const settingsEvent1 = messages.find(m => m.type === 'settings_sync' && m.settings?.targetLanguage === 'de');
    expect(settingsEvent1).toMatchObject({
      type: 'settings_sync',
      settings: {
        baseLanguage: 'en',
        targetLanguage: 'de'
      }
    });

    const userInDbAfterSettings = await prisma.user.findFirst({
      where: { accounts: { some: { providerAccountId: testUsername } } },
      include: { dictionaries: true }
    });
    
    expect(userInDbAfterSettings).toBeDefined();
    expect(userInDbAfterSettings?.dictionaries[0]?.baseLanguage).toBe('en');

    // Частичное изменение настроек
    const patchSettingsRes = await request(app)
      .post('/api/v1/settings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        targetLanguage: 'es'
      });

    expect(patchSettingsRes).toMatchObject({
      status: 200,
      body: {
        settings: {
          baseLanguage: 'en',
          targetLanguage: 'es'
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    const settingsEvent2 = messages.find(m => m.type === 'settings_sync' && m.settings?.targetLanguage === 'es');
    expect(settingsEvent2).toMatchObject({
      type: 'settings_sync',
      settings: {
        targetLanguage: 'es'
      }
    });
  });
});
