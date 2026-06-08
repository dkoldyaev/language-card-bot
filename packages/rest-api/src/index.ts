import express from 'express';
import { apiReference } from '@scalar/express-api-reference';
import { getBroker } from '@ecb/broker-mock';
import { UserRepository, WordRepository, WordEnrichmentOrchestrator, QuizService } from '@ecb/core-service';
import { bootstrap as startTranslationService } from '@ecb/translation-service';
import { bootstrap as startDefinitionsService } from '@ecb/definitions-service';
import { createApiRouter } from './router';
import { openApiSpec } from './openapi';
import { errorHandler } from './middleware/errors';

const PORT = process.env.REST_PORT ? parseInt(process.env.REST_PORT, 10) : 3002;

/**
 * REST API — точка входа.
 *
 * Монтирует:
 *   /api/*         — REST эндпоинты
 *   /docs          — Scalar API Reference (интерактивная документация)
 *   /openapi.json  — OpenAPI 3.1 спецификация (машинночитаемый формат)
 *
 * Middleware стек (порядок важен):
 *   1. JSON парсинг
 *   2. CORS
 *   3. Request logger
 *   4. Роутеры
 *   5. 404 handler
 *   6. Error handler (должен быть последним)
 *
 * TODO: Добавить auth middleware (JWT проверку).
 * TODO: Добавить rate limiting.
 */
async function bootstrap(): Promise<void> {
  // ── Shared infrastructure (monolith-режим) ────────────────────────────────
  const broker = getBroker();
  const users = new UserRepository();
  const words = new WordRepository();
  const orchestrator = new WordEnrichmentOrchestrator(broker, users, words);
  const quiz = new QuizService(words);

  // Регистрируем подписчиков mock-сервисов
  startTranslationService();
  startDefinitionsService();

  // ── Express ───────────────────────────────────────────────────────────────
  const app = express();

  // 1. JSON парсинг
  app.use(express.json());

  // 2. CORS (для dev-доступа из браузера / Scalar)
  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (_req.method === 'OPTIONS') return void res.status(204).send();
    next();
  });

  // 3. Request logger
  app.use((req, _res, next) => {
    console.log(`[RestAPI] ${req.method} ${req.path}`);
    next();
  });

  // 4. REST API Routes
  app.use('/api', createApiRouter(users, words, orchestrator, quiz));

  // 5. OpenAPI JSON
  app.get('/openapi.json', (_req, res) => {
    res.json(openApiSpec);
  });

  // 6. Scalar API Reference
  app.use(
    '/docs',
    apiReference({
      spec: { url: '/openapi.json' },
      theme: 'purple',
      defaultHttpClient: { targetKey: 'javascript', clientKey: 'fetch' },
      layout: 'modern',
    })
  );

  // Редирект с корня
  app.get('/', (_req, res) => res.redirect('/docs'));

  // 7. 404 для неизвестных путей
  app.use((_req, res) => {
    res.status(404).json({ error: 'Маршрут не найден' });
  });

  // 8. Центральный обработчик ошибок (ДОЛЖЕН БЫТЬ ПОСЛЕДНИМ)
  app.use(errorHandler);

  // ── Запуск ────────────────────────────────────────────────────────────────
  app.listen(PORT, () => {
    console.log(`\n[RestAPI] 🚀 Server started`);
    console.log(`[RestAPI]    REST API:  http://localhost:${PORT}/api/health`);
    console.log(`[RestAPI]    Docs:      http://localhost:${PORT}/docs`);
    console.log(`[RestAPI]    OpenAPI:   http://localhost:${PORT}/openapi.json\n`);
  });
}

if (require.main === module) {
  bootstrap().catch((err) => {
    console.error('[RestAPI] Fatal startup error:', err);
    process.exit(1);
  });
}

export { bootstrap };
