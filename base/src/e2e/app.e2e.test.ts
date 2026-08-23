import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../prisma';
import jwt from 'jsonwebtoken';

describe('App E2E Flow', () => {
  let userToken: string;

  beforeEach(async () => {
    // Очищаем тестовую БД перед каждым тестом (удаление пользователей каскадно удалит и стейты)
    const deleteUsers = prisma.user.deleteMany();
    await prisma.$transaction([deleteUsers]);
  });

  afterAll(async () => {
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

    // 3. Echo запрос
    const echoPayload = { message: 'Hello from e2e!' };
    const echoRes = await request(app)
      .post('/api/v1/echo')
      .set('Authorization', `Bearer ${userToken}`)
      .send(echoPayload);

    expect(echoRes.status).toBe(200);
    expect(echoRes.body.message).toBe('Echo successful');
    expect(echoRes.body.data).toEqual(echoPayload);

    // 4. Переключение в режим словаря (dictionary_view) и проверка Mercure SSE
    const subscriberToken = process.env.MERCURE_JWT;

    const mercureUrl = process.env.MERCURE_URL!;
    const topic = `${process.env.BASE_DOMAIN}/v1/users/${testUsername}`;
    const url = new URL(mercureUrl);
    url.searchParams.append('topic', topic);

    // Подключаемся к Mercure как SSE клиент
    const esRes = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${subscriberToken}`,
        'Accept': 'text/event-stream'
      }
    });

    if (!esRes.ok) {
      throw new Error(`SSE fetch failed: ${esRes.status}`);
    }
    
    // Получаем reader для чтения потока
    const reader = esRes.body!.getReader();
    const decoder = new TextDecoder();
    const messages: any[] = [];

    // Читаем поток асинхронно
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

    // Отправляем запрос, который должен сгенерировать SSE событие
    const dictRes = await request(app)
      .post('/api/v1/dictionary_view/switch_to_dictionary')
      .set('Authorization', `Bearer ${userToken}`);

    expect(dictRes.status).toBe(200);
    expect(dictRes.body.message).toBe('Switched to dictionary view');

    // Даем время на доставку сообщения
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Закрываем ридер чтобы остановить readStream
    await reader.cancel();
    await streamPromise;

    // Проверяем, что событие пришло
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0].type).toBe('state_sync');
    expect(messages[0].mode).toBe('DICTIONARY_VIEW');

    // Проверяем БД, что стейт юзера действительно изменился на DICTIONARY_VIEW
    const userInDb = await prisma.user.findUnique({
      where: { username: testUsername },
      include: { state: true }
    });
    
    expect(userInDb).toBeDefined();
    expect(userInDb?.state?.mode).toBe('DICTIONARY_VIEW');

    // 5. Переключение в режим добавления словаря (dictionary_add) и проверка БД
    const dictAddRes = await request(app)
      .post('/api/v1/dictionary_add/switch_to_dictionary_add')
      .set('Authorization', `Bearer ${userToken}`);

    expect(dictAddRes.status).toBe(200);
    expect(dictAddRes.body.message).toBe('Switched to dictionary add view');

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

    // Подключаемся к Mercure как SSE клиент для settings
    const settingsTopic = `${process.env.BASE_DOMAIN}/v1/users/${testUsername}`;
    const settingsUrl = new URL(mercureUrl);
    settingsUrl.searchParams.append('topic', settingsTopic);

    const esSettingsRes = await fetch(settingsUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${subscriberToken}`,
        'Accept': 'text/event-stream'
      }
    });

    if (!esSettingsRes.ok) {
      throw new Error(`SSE fetch failed: ${esSettingsRes.status}`);
    }
    
    const settingsReader = esSettingsRes.body!.getReader();
    const settingsMessages: any[] = [];
    const readSettingsStream = async () => {
      while (true) {
        const { done, value } = await settingsReader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            settingsMessages.push(JSON.parse(line.substring(6)));
          }
        }
      }
    };
    const settingsStreamPromise = readSettingsStream();

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
    
    // Закрываем ридер чтобы остановить readStream
    await settingsReader.cancel();
    await settingsStreamPromise;

    // Проверяем, что событие пришло
    expect(settingsMessages.length).toBeGreaterThan(0);
    expect(settingsMessages[0].type).toBe('settings_sync');
    expect(settingsMessages[0].settings.baseLanguage).toBe('en');
    expect(settingsMessages[0].settings.targetLanguage).toBe('de');
    expect(settingsMessages[0].settings.desiredLevel).toBe('C1');

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

    // Проверяем БД, что частичное обновление сработало
    const userInDbAfterPatch = await prisma.user.findUnique({
      where: { username: testUsername },
      include: { settings: true }
    });

    expect(userInDbAfterPatch).toBeDefined();
    expect(userInDbAfterPatch?.settings?.baseLanguage).toBe('en');
    expect(userInDbAfterPatch?.settings?.targetLanguage).toBe('es');
    expect(userInDbAfterPatch?.settings?.desiredLevel).toBe('C1');
  });
});
