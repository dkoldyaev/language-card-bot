import { Router } from 'express';
import { UserRepository, WordRepository, WordEnrichmentOrchestrator, QuizService } from '@ecb/core-service';
import { createUsersRouter } from './routes/users';
import { createSettingsRouter } from './routes/settings';
import { createWordsRouter } from './routes/words';
import { createQuizApiRouter } from './routes/quiz';

/**
 * Корневой API роутер.
 * Монтирует доменные роутеры по их путям.
 *
 * Все пути без /api-префикса (он добавляется в index.ts при монтировании).
 */
export function createApiRouter(
  users: UserRepository,
  words: WordRepository,
  orchestrator: WordEnrichmentOrchestrator,
  quiz: QuizService
): Router {
  const router = Router();

  // Health check
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'rest-api', ts: new Date().toISOString() });
  });

  // Доменные роутеры
  router.use('/users', createUsersRouter(users));

  // Настройки — вложены в /users/:userId
  router.use('/users/:userId/settings', createSettingsRouter(users));

  // Словарь — вложен в /users/:userId
  router.use('/users/:userId/words', createWordsRouter(users, words, orchestrator));

  // Quiz — вложен в /users/:userId
  router.use('/users/:userId/quiz', createQuizApiRouter(quiz));

  return router;
}
