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
    const topic = `http://localhost/v1/users/${testUsername}/state`;
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
  });
});
