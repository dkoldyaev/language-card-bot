import express from 'express';
import { apiReference } from '@scalar/express-api-reference';
import { getBroker } from '@ecb/broker-mock';
import { UserRepository, WordRepository, WordEnrichmentOrchestrator } from '@ecb/core-service';
import { bootstrap as startTranslationService } from '@ecb/translation-service';
import { bootstrap as startDefinitionsService } from '@ecb/definitions-service';
import { createApiRouter } from './router';
import { openApiSpec } from './openapi';

const PORT = process.env.REST_PORT ? parseInt(process.env.REST_PORT, 10) : 3002;

/**
 * REST API — точка входа.
 *
 * Монтирует:
 *   /api/*         — REST эндпоинты
 *   /docs          — Scalar API Reference (интерактивная документация)
 *   /openapi.json  — OpenAPI 3.1 спецификация (машинночитаемый формат)
 *
 * TODO: Добавить CORS middleware для PWA.
 * TODO: Добавить auth middleware (JWT проверку).
 * TODO: Добавить request validation (zod / ajv).
 */
async function bootstrap(): Promise<void> {
  // ── Shared infrastructure (monolith-режим) ────────────────────────────────
  const broker = getBroker();
  const users = new UserRepository();
  const words = new WordRepository();
  const orchestrator = new WordEnrichmentOrchestrator(broker, users, words);

  // Регистрируем подписчиков mock-сервисов
  startTranslationService();
  startDefinitionsService();

  // ── Express ───────────────────────────────────────────────────────────────
  const app = express();

  // Парсинг JSON
  app.use(express.json());

  // CORS заголовки (для dev-доступа из браузера)
  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (_req.method === 'OPTIONS') return void res.status(204).send();
    next();
  });

  // ── REST API Routes ───────────────────────────────────────────────────────
  app.use('/api', createApiRouter(users, words, orchestrator));

  // ── OpenAPI JSON endpoint ─────────────────────────────────────────────────
  // Scalar и другие инструменты загружают спецификацию с этого URL
  app.get('/openapi.json', (_req, res) => {
    res.json(openApiSpec);
  });

  // ── Scalar API Reference ──────────────────────────────────────────────────
  // Интерактивная документация: http://localhost:3002/docs
  app.use(
    '/docs',
    apiReference({
      spec: {
        url: '/openapi.json',
      },
      theme: 'purple',          // доступные темы: default, alternate, moon, purple, solarized
      defaultHttpClient: {
        targetKey: 'javascript',
        clientKey: 'fetch',
      },
      layout: 'modern',
    })
  );

  // Редирект с корня на документацию
  app.get('/', (_req, res) => {
    res.redirect('/docs');
  });

  // ── Запуск ────────────────────────────────────────────────────────────────
  app.listen(PORT, () => {
    console.log(`\n[RestAPI] 🚀 Server started`);
    console.log(`[RestAPI]    REST API:  http://localhost:${PORT}/api/health`);
    console.log(`[RestAPI]    Docs:      http://localhost:${PORT}/docs`);
    console.log(`[RestAPI]    OpenAPI:   http://localhost:${PORT}/openapi.json`);
    console.log('');
  });
}

if (require.main === module) {
  bootstrap().catch((err) => {
    console.error('[RestAPI] Fatal startup error:', err);
    process.exit(1);
  });
}

export { bootstrap };
