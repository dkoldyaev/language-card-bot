import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { UserRepository } from '../repositories/UserRepository';
import { WordRepository } from '../repositories/WordRepository';
import { WordEnrichmentOrchestrator } from '../services/WordEnrichmentOrchestrator';
import { createRouter } from '../api/router';
import { IBroker, EventHandler, Language, CefrLevel, WordStatus } from '@ecb/shared';

/**
 * Тесты HTTP API роутера (createRouter)
 *
 * Используем Supertest для отправки реальных HTTP-запросов к Express-роутеру.
 * Брокер — заглушка (ничего не делает), чтобы enrich() не вызывал побочных эффектов.
 *
 * Покрываем все 9 эндпоинтов:
 *   GET  /health
 *   GET  /users/:userId/settings
 *   PUT  /users/:userId/settings
 *   GET  /users/:userId/words
 *   POST /users/:userId/words
 *   DELETE /users/:userId/words/:wordId
 *   PUT  /users/:userId/words/:wordId/definitions/:defId
 *   POST /users/telegram/:telegramId
 *   GET  /users/telegram/:telegramId
 */

/** Брокер-заглушка: publish/subscribe ничего не делают */
class NoopBroker implements IBroker {
  publish<T>(_topic: string, _payload: T): void {}
  subscribe<T>(_topic: string, _handler: EventHandler<T>): void {}
}

function buildApp() {
  const users = new UserRepository();
  const words = new WordRepository();
  const broker = new NoopBroker();
  const orchestrator = new WordEnrichmentOrchestrator(broker, users, words);

  const app = express();
  app.use(express.json());
  app.use('/', createRouter(users, words, orchestrator));

  return { app, users, words };
}

describe('HTTP API Router', () => {
  let app: express.Application;
  let users: UserRepository;
  let words: WordRepository;

  beforeEach(() => {
    ({ app, users, words } = buildApp());
  });

  // ── GET /health ─────────────────────────────────────────────────────────

  describe('GET /health', () => {
    it('возвращает 200 со статусом ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('core-service');
      expect(res.body.ts).toBeTruthy();
    });
  });

  // ── GET /users/:userId/settings ─────────────────────────────────────────

  describe('GET /users/:userId/settings', () => {
    it('возвращает настройки пользователя', async () => {
      const user = users.create();
      const res = await request(app).get(`/users/${user.id}/settings`);
      expect(res.status).toBe(200);
      expect(res.body.baseLanguage).toBe(Language.Russian);
      expect(res.body.learnedLanguage).toBe(Language.English);
      expect(res.body.level).toBe(CefrLevel.A1);
    });

    it('возвращает 404 если пользователь не найден', async () => {
      const res = await request(app).get('/users/bad-id/settings');
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });
  });

  // ── PUT /users/:userId/settings ─────────────────────────────────────────

  describe('PUT /users/:userId/settings', () => {
    it('обновляет настройки и возвращает их', async () => {
      const user = users.create();
      const res = await request(app)
        .put(`/users/${user.id}/settings`)
        .send({ level: CefrLevel.B2 });
      expect(res.status).toBe(200);
      expect(res.body.level).toBe(CefrLevel.B2);
    });

    it('возвращает 400 при невалидном baseLanguage', async () => {
      const user = users.create();
      const res = await request(app)
        .put(`/users/${user.id}/settings`)
        .send({ baseLanguage: 'klingon' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/baseLanguage/i);
    });

    it('возвращает 400 при невалидном learnedLanguage', async () => {
      const user = users.create();
      const res = await request(app)
        .put(`/users/${user.id}/settings`)
        .send({ learnedLanguage: 'elvish' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/learnedLanguage/i);
    });

    it('возвращает 400 при невалидном level', async () => {
      const user = users.create();
      const res = await request(app)
        .put(`/users/${user.id}/settings`)
        .send({ level: 'Z9' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/level/i);
    });

    it('возвращает 404 если пользователь не найден', async () => {
      const res = await request(app)
        .put('/users/bad-id/settings')
        .send({ level: CefrLevel.A2 });
      expect(res.status).toBe(404);
    });
  });

  // ── GET /users/:userId/words ────────────────────────────────────────────

  describe('GET /users/:userId/words', () => {
    it('возвращает пустой массив для нового пользователя', async () => {
      const user = users.create();
      const res = await request(app).get(`/users/${user.id}/words`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('возвращает слова пользователя', async () => {
      const user = users.create();
      words.create(user.id, 'hello');
      words.create(user.id, 'world');
      const res = await request(app).get(`/users/${user.id}/words`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('возвращает 404 если пользователь не найден', async () => {
      const res = await request(app).get('/users/bad-id/words');
      expect(res.status).toBe(404);
    });
  });

  // ── POST /users/:userId/words ───────────────────────────────────────────

  describe('POST /users/:userId/words', () => {
    it('создаёт новое слово и возвращает 201', async () => {
      const user = users.create();
      const res = await request(app)
        .post(`/users/${user.id}/words`)
        .send({ text: 'apple' });
      expect(res.status).toBe(201);
      expect(res.body.text).toBe('apple');
      expect(res.body.status).toBe(WordStatus.Pending);
    });

    it('возвращает 400 если text пустой', async () => {
      const user = users.create();
      const res = await request(app)
        .post(`/users/${user.id}/words`)
        .send({ text: '   ' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/text is required/i);
    });

    it('возвращает 400 если text отсутствует', async () => {
      const user = users.create();
      const res = await request(app)
        .post(`/users/${user.id}/words`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('возвращает 404 если пользователь не найден', async () => {
      const res = await request(app)
        .post('/users/bad-id/words')
        .send({ text: 'apple' });
      expect(res.status).toBe(404);
    });

    it('возвращает 409 при добавлении дубликата', async () => {
      const user = users.create();
      await request(app).post(`/users/${user.id}/words`).send({ text: 'apple' });
      const res = await request(app)
        .post(`/users/${user.id}/words`)
        .send({ text: 'apple' });
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already exists/i);
    });

    it('дедупликация нечувствительна к регистру', async () => {
      const user = users.create();
      await request(app).post(`/users/${user.id}/words`).send({ text: 'Apple' });
      const res = await request(app)
        .post(`/users/${user.id}/words`)
        .send({ text: 'apple' });
      expect(res.status).toBe(409);
    });
  });

  // ── DELETE /users/:userId/words/:wordId ─────────────────────────────────

  describe('DELETE /users/:userId/words/:wordId', () => {
    it('удаляет слово и возвращает 204', async () => {
      const user = users.create();
      const word = words.create(user.id, 'delete-me');
      const res = await request(app).delete(`/users/${user.id}/words/${word.id}`);
      expect(res.status).toBe(204);
      expect(words.findById(word.id)).toBeUndefined();
    });

    it('возвращает 404 для несуществующего слова', async () => {
      const user = users.create();
      const res = await request(app).delete(`/users/${user.id}/words/bad-id`);
      expect(res.status).toBe(404);
    });

    it('возвращает 404 если слово принадлежит другому пользователю', async () => {
      const user1 = users.create();
      const user2 = users.create();
      const word = words.create(user1.id, 'test');
      const res = await request(app).delete(`/users/${user2.id}/words/${word.id}`);
      expect(res.status).toBe(404);
    });
  });

  // ── PUT /users/:userId/words/:wordId/definitions/:defId ─────────────────

  describe('PUT /users/:userId/words/:wordId/definitions/:defId', () => {
    it('обновляет текст определения', async () => {
      const user = users.create();
      const word = words.create(user.id, 'test');
      const [def] = words.addDefinitions(word.id, [{ text: 'original' }]);

      const res = await request(app)
        .put(`/users/${user.id}/words/${word.id}/definitions/${def.id}`)
        .send({ text: 'updated text' });
      expect(res.status).toBe(200);
      const updatedDef = res.body.definitions.find((d: any) => d.id === def.id);
      expect(updatedDef.text).toBe('updated text');
    });

    it('обновляет перевод определения', async () => {
      const user = users.create();
      const word = words.create(user.id, 'test');
      const [def] = words.addDefinitions(word.id, [{ text: 'original' }]);

      const res = await request(app)
        .put(`/users/${user.id}/words/${word.id}/definitions/${def.id}`)
        .send({ translation: 'перевод' });
      expect(res.status).toBe(200);
      const updatedDef = res.body.definitions.find((d: any) => d.id === def.id);
      expect(updatedDef.translation).toBe('перевод');
    });

    it('возвращает 404 если слово не найдено', async () => {
      const user = users.create();
      const res = await request(app)
        .put(`/users/${user.id}/words/bad-id/definitions/def-id`)
        .send({ text: 'x' });
      expect(res.status).toBe(404);
    });

    it('возвращает 404 если определение не существует', async () => {
      const user = users.create();
      const word = words.create(user.id, 'test');
      const res = await request(app)
        .put(`/users/${user.id}/words/${word.id}/definitions/bad-def-id`)
        .send({ translation: 'x' });
      expect(res.status).toBe(404);
    });
  });

  // ── POST /users/telegram/:telegramId ────────────────────────────────────

  describe('POST /users/telegram/:telegramId', () => {
    it('создаёт нового пользователя по telegramId', async () => {
      const res = await request(app).post('/users/telegram/tg-100');
      expect(res.status).toBe(200);
      expect(res.body.telegramId).toBe('tg-100');
    });

    it('идемпотентен — повторный вызов возвращает того же пользователя', async () => {
      const res1 = await request(app).post('/users/telegram/tg-200');
      const res2 = await request(app).post('/users/telegram/tg-200');
      expect(res1.body.id).toBe(res2.body.id);
    });
  });

  // ── GET /users/telegram/:telegramId ─────────────────────────────────────

  describe('GET /users/telegram/:telegramId', () => {
    it('возвращает пользователя по telegramId', async () => {
      users.create({ telegramId: 'tg-300' });
      const res = await request(app).get('/users/telegram/tg-300');
      expect(res.status).toBe(200);
      expect(res.body.telegramId).toBe('tg-300');
    });

    it('возвращает 404 если telegramId не зарегистрирован', async () => {
      const res = await request(app).get('/users/telegram/unknown-tg');
      expect(res.status).toBe(404);
    });
  });
});
