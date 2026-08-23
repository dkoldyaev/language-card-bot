import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../prisma';
import jwt from 'jsonwebtoken';
import { dictionaryQueue, queueConnection } from '../features/add_word/add_word.queue';
import { dictionaryWorker, workerConnection } from '../features/add_word/add_word.worker';

describe('App E2E Flow', () => {
  let userToken: string;

  beforeEach(async () => {
    // Очищаем тестовую БД перед каждым тестом (удаление пользователей каскадно удалит и стейты)
    const deleteUsers = prisma.user.deleteMany();
    await prisma.$transaction([deleteUsers]);
  });

  afterAll(async () => {
    await dictionaryQueue.close();
    await dictionaryWorker.close();
    queueConnection.quit();
    workerConnection.quit();
    await prisma.$disconnect();
  });

  it('should successfully register, login, echo, and switch to dictionary view', async () => {
    const testUsername = 'e2e_user';

    // 1. Регистрация
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: testUsername });

    expect(registerRes.status).toBe(200);
    expect(registerRes.body.user.username).toBe(testUsername);
    expect(registerRes.body).toHaveProperty('token');

    // 2. Авторизация (Логин)
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: testUsername });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.username).toBe(testUsername);
    expect(loginRes.body).toHaveProperty('token');
    
    // Сохраняем токен для дальнейших запросов
    userToken = loginRes.body.token;

    // Подключаемся к Mercure как SSE клиент ОДИН РАЗ для всего теста
    const subscriberToken = process.env.MERCURE_JWT;
    const mercureUrl = process.env.MERCURE_URL!;
    const topic = `${process.env.BASE_DOMAIN}/v1/users/${testUsername}`;
    const url = new URL(mercureUrl);
    url.searchParams.append('topic', topic);

    const originalFetchForE2E = global.fetch;
    const esRes = await originalFetchForE2E(url.toString(), {
      headers: {
        'Authorization': `Bearer ${subscriberToken}`,
        'Accept': 'text/event-stream'
      }
    });

    if (!esRes.ok) {
      throw new Error(`SSE fetch failed: ${esRes.status}`);
    }
    
    const reader = esRes.body!.getReader();
    const decoder = new TextDecoder();
    const messages: any[] = [];

    const readStream = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            messages.push(JSON.parse(line.substring(6)));
          }
        }
      }
    };
    const streamPromise = readStream();

    // Даем время на установку соединения
    await new Promise(resolve => setTimeout(resolve, 100));

    // 3. Echo запрос
    const echoPayload = { message: 'Hello from e2e!' };
    const echoRes = await request(app)
      .post('/api/v1/echo')
      .set('Authorization', `Bearer ${userToken}`)
      .send(echoPayload);

    expect(echoRes.status).toBe(200);
    expect(echoRes.body.message).toBe('Echo successful');
    expect(echoRes.body.data).toEqual(echoPayload);

    // Даем время на доставку сообщения Echo
    await new Promise(resolve => setTimeout(resolve, 500));
    const echoEvent = messages.find(m => m.type === 'echo');
    expect(echoEvent).toBeDefined();
    expect(echoEvent.data).toEqual(echoPayload);

    // 4. Переключение в режим словаря (dictionary_view)
    const dictRes = await request(app)
      .post('/api/v1/switch_mode_dictionary_view')
      .set('Authorization', `Bearer ${userToken}`);

    expect(dictRes.status).toBe(200);
    expect(dictRes.body.message).toBe('Switched to dictionary view');

    // Даем время на доставку сообщения
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Проверяем, что событие пришло
    const viewEvent = messages.find(m => m.type === 'state_sync' && m.mode === 'DICTIONARY_VIEW');
    expect(viewEvent).toBeDefined();

    // Проверяем БД, что стейт юзера действительно изменился на DICTIONARY_VIEW
    const userInDb = await prisma.user.findUnique({
      where: { username: testUsername },
      include: { state: true }
    });
    
    expect(userInDb).toBeDefined();
    expect(userInDb?.state?.mode).toBe('DICTIONARY_VIEW');

    // 5. Переключение в режим добавления словаря (dictionary_add) и проверка БД
    const dictAddRes = await request(app)
      .post('/api/v1/switch_mode_dictionary_add')
      .set('Authorization', `Bearer ${userToken}`);

    expect(dictAddRes.status).toBe(200);
    expect(dictAddRes.body.message).toBe('Switched to dictionary add view');

    // Даем время на доставку сообщения
    await new Promise(resolve => setTimeout(resolve, 500));
    const addModeEvent = messages.find(m => m.type === 'state_sync' && m.mode === 'DICTIONARY_ADD');
    expect(addModeEvent).toBeDefined();

    const userInDbAfterAdd = await prisma.user.findUnique({
      where: { username: testUsername },
      include: { state: true }
    });
    
    expect(userInDbAfterAdd).toBeDefined();
    expect(userInDbAfterAdd?.state?.mode).toBe('DICTIONARY_ADD');
    // 6. Настройки пользователя (settings)
    // 6.1 Получение настроек (создание по умолчанию)
    const getSettingsRes = await request(app)
      .get('/api/v1/settings')
      .set('Authorization', `Bearer ${userToken}`);
      
    expect(getSettingsRes.status).toBe(200);
    expect(getSettingsRes.body.settings.baseLanguage).toBe('ru');
    expect(getSettingsRes.body.settings.targetLanguage).toBe('en');
    expect(getSettingsRes.body.settings.desiredLevel).toBe('B2');


    // 6.2 Изменение настроек
    const postSettingsRes = await request(app)
      .post('/api/v1/settings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        baseLanguage: 'en',
        targetLanguage: 'de',
        desiredLevel: 'C1'
      });

    expect(postSettingsRes.status).toBe(200);
    expect(postSettingsRes.body.settings.baseLanguage).toBe('en');
    expect(postSettingsRes.body.settings.targetLanguage).toBe('de');
    expect(postSettingsRes.body.settings.desiredLevel).toBe('C1');

    // Даем время на доставку сообщения
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Проверяем, что событие пришло
    const settingsEvent1 = messages.find(m => m.type === 'settings_sync' && m.settings?.targetLanguage === 'de');
    expect(settingsEvent1).toBeDefined();
    expect(settingsEvent1.settings.baseLanguage).toBe('en');
    expect(settingsEvent1.settings.desiredLevel).toBe('C1');

    // Проверяем БД, что настройки обновились
    const userInDbAfterSettings = await prisma.user.findUnique({
      where: { username: testUsername },
      include: { settings: true }
    });
    
    expect(userInDbAfterSettings).toBeDefined();
    expect(userInDbAfterSettings?.settings?.baseLanguage).toBe('en');
    expect(userInDbAfterSettings?.settings?.targetLanguage).toBe('de');
    expect(userInDbAfterSettings?.settings?.desiredLevel).toBe('C1');

    // 6.3 Частичное изменение настроек
    const patchSettingsRes = await request(app)
      .post('/api/v1/settings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        targetLanguage: 'es'
      });

    expect(patchSettingsRes.status).toBe(200);
    // targetLanguage should change, others stay the same as before
    expect(patchSettingsRes.body.settings.baseLanguage).toBe('en');
    expect(patchSettingsRes.body.settings.targetLanguage).toBe('es');
    expect(patchSettingsRes.body.settings.desiredLevel).toBe('C1');

    await new Promise(resolve => setTimeout(resolve, 500));

    // Проверяем событие в Mercure
    const settingsEvent2 = messages.find(m => m.type === 'settings_sync' && m.settings?.targetLanguage === 'es');
    expect(settingsEvent2).toBeDefined();
    expect(settingsEvent2.settings.baseLanguage).toBe('en');
    expect(settingsEvent2.settings.desiredLevel).toBe('C1');

    // Проверяем БД, что частичное обновление сработало
    const userInDbAfterPatch = await prisma.user.findUnique({
      where: { username: testUsername },
      include: { settings: true }
    });

    expect(userInDbAfterPatch).toBeDefined();
    expect(userInDbAfterPatch?.settings?.baseLanguage).toBe('en');
    expect(userInDbAfterPatch?.settings?.targetLanguage).toBe('es');
    expect(userInDbAfterPatch?.settings?.desiredLevel).toBe('C1');

    // 7. add_word endpoint tests
    const originalFetch = global.fetch;
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url, options) => {
      const urlStr = url.toString();
      if (urlStr.includes('define')) {
        return new Response(JSON.stringify({ definitions: ['def1', 'def2'] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (urlStr.includes('translate')) {
        return new Response(JSON.stringify({ translatedText: 'mocked_translation' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return originalFetch(url, options);
    });

    // 7.1 Fails when not in DICTIONARY_ADD mode (currently in DICTIONARY_ADD from step 5, let's switch to DEFAULT first)
    await prisma.userState.update({
      where: { userId: userInDbAfterAdd!.id },
      data: { mode: 'DEFAULT' }
    });

    const addWordFailRes = await request(app)
      .post('/api/v1/add_word')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ word: 'apple' });

    expect(addWordFailRes.status).toBe(403);
    expect(addWordFailRes.body.error).toBe('User is not in DICTIONARY_ADD mode');

    // Switch back to DICTIONARY_ADD
    await prisma.userState.update({
      where: { userId: userInDbAfterAdd!.id },
      data: { mode: 'DICTIONARY_ADD' }
    });

    // 7.2 Successfully adds word
    const addWordSuccessRes = await request(app)
      .post('/api/v1/add_word')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ word: 'apple' });

    expect(addWordSuccessRes.status).toBe(200);
    expect(addWordSuccessRes.body.message).toBe('Word added successfully');

    // Wait for async events to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify DB records
    const createdWord = await prisma.word.findUnique({
      where: { userId_text: { userId: userInDbAfterAdd!.id, text: 'apple' } },
      include: {
        definitions: {
          include: { translation: true }
        }
      }
    });

    expect(createdWord).toBeDefined();
    expect(createdWord?.text).toBe('apple');
    expect(createdWord?.definitions.length).toBe(2);
    expect(createdWord?.definitions[0].translation?.text).toBe('mocked_translation');

    // 7.3 Duplicate word check
    const duplicateAddRes = await request(app)
      .post('/api/v1/add_word')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ word: 'Apple ' }); // testing trim and lowercase

    expect(duplicateAddRes.status).toBe(200);
    expect(duplicateAddRes.body.message).toBe('Word already exists');

    // Wait for duplicate event
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Close the original reader now that all tests are done
    await reader.cancel();
    await streamPromise;
    fetchSpy.mockRestore();

    // Verify events in Mercure
    const processingEvents = messages.filter(m => m.type === 'dictionary_add_processing');
    expect(processingEvents.length).toBe(1);
    expect(processingEvents[0].word).toBe('apple');

    const defsReceivedEvents = messages.filter(m => m.type === 'dictionary_add_definitions_received');
    expect(defsReceivedEvents.length).toBe(1);
    expect(defsReceivedEvents[0].definitionsCount).toBe(2);

    const defProcessedEvents = messages.filter(m => m.type === 'dictionary_add_definition_processed');
    expect(defProcessedEvents.length).toBe(2); // 2 definitions
    expect(defProcessedEvents[0].totalDefinitions).toBe(2);

    const duplicateEvents = messages.filter(m => m.type === 'dictionary_add_duplicate');
    expect(duplicateEvents.length).toBe(1);
    expect(duplicateEvents[0].word).toBe('apple');
    expect(duplicateEvents[0].definitionsCount).toBe(2);

  });
});
