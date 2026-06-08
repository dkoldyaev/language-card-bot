import { Router, Request, Response } from 'express';
import { UserRepository } from '../repositories/UserRepository';
import { WordRepository } from '../repositories/WordRepository';
import { WordEnrichmentOrchestrator } from '../services/WordEnrichmentOrchestrator';
import {
  AddWordRequest,
  UpdateSettingsRequest,
  UpdateDefinitionRequest,
  Language,
  CefrLevel,
  WordStatus,
} from '@ecb/shared';

/**
 * HTTP API для Core Service.
 *
 * Все эндпоинты работают с in-memory репозиториями.
 * Frontend-клиенты (telegram-bot, PWA) обращаются сюда через HTTP.
 *
 * Маршруты:
 *   GET  /health
 *   GET  /users/:userId/settings
 *   PUT  /users/:userId/settings
 *   GET  /users/:userId/words
 *   POST /users/:userId/words
 *   DELETE /users/:userId/words/:wordId
 *   PUT  /users/:userId/words/:wordId/definitions/:defId
 */
export function createRouter(
  users: UserRepository,
  words: WordRepository,
  orchestrator: WordEnrichmentOrchestrator
): Router {
  const router = Router();

  // ── Health ────────────────────────────────────────────────────────────────
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'core-service', ts: new Date().toISOString() });
  });

  // ── Settings ──────────────────────────────────────────────────────────────
  router.get('/users/:userId/settings', (req: Request, res: Response) => {
    const user = users.findById(req.params.userId);
    if (!user) return void res.status(404).json({ error: 'User not found' });
    res.json(user.settings);
  });

  router.put('/users/:userId/settings', (req: Request, res: Response) => {
    const body = req.body as UpdateSettingsRequest;
    try {
      // Валидация значений языка и уровня
      if (body.baseLanguage && !Object.values(Language).includes(body.baseLanguage)) {
        return void res.status(400).json({ error: `Invalid baseLanguage: ${body.baseLanguage}` });
      }
      if (body.learnedLanguage && !Object.values(Language).includes(body.learnedLanguage)) {
        return void res.status(400).json({ error: `Invalid learnedLanguage: ${body.learnedLanguage}` });
      }
      if (body.level && !Object.values(CefrLevel).includes(body.level)) {
        return void res.status(400).json({ error: `Invalid level: ${body.level}` });
      }

      const user = users.updateSettings(req.params.userId, body);
      res.json(user.settings);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(404).json({ error: message });
    }
  });

  // ── Words ─────────────────────────────────────────────────────────────────
  router.get('/users/:userId/words', (req: Request, res: Response) => {
    const user = users.findById(req.params.userId);
    if (!user) return void res.status(404).json({ error: 'User not found' });
    const userWords = words.findByUserId(req.params.userId);
    res.json(userWords);
  });

  router.post('/users/:userId/words', (req: Request, res: Response) => {
    const { text } = req.body as AddWordRequest;
    if (!text || !text.trim()) {
      return void res.status(400).json({ error: 'text is required' });
    }

    const user = users.findById(req.params.userId);
    if (!user) return void res.status(404).json({ error: 'User not found' });

    // Проверяем дубликат
    const existing = words.findByUserIdAndText(req.params.userId, text);
    if (existing) {
      return void res.status(409).json({
        error: 'Word already exists',
        word: existing,
      });
    }

    const word = words.create(req.params.userId, text);
    // Запускаем асинхронное обогащение
    orchestrator.enrich(word);

    res.status(201).json(word);
  });

  router.delete('/users/:userId/words/:wordId', (req: Request, res: Response) => {
    const word = words.findById(req.params.wordId);
    if (!word || word.userId !== req.params.userId) {
      return void res.status(404).json({ error: 'Word not found' });
    }
    words.delete(req.params.wordId);
    res.status(204).send();
  });

  // ── Definitions ───────────────────────────────────────────────────────────
  router.put(
    '/users/:userId/words/:wordId/definitions/:defId',
    (req: Request, res: Response) => {
      const body = req.body as UpdateDefinitionRequest;
      try {
        let word = words.findById(req.params.wordId);
        if (!word || word.userId !== req.params.userId) {
          return void res.status(404).json({ error: 'Word not found' });
        }

        if (body.text !== undefined) {
          word = words.updateDefinitionText(req.params.wordId, req.params.defId, body.text);
        }
        if (body.translation !== undefined) {
          word = words.updateDefinitionTranslation(
            req.params.wordId,
            req.params.defId,
            body.translation
          );
        }
        res.json(word);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        res.status(404).json({ error: message });
      }
    }
  );

  // ── User provisioning (для telegram-bot: найти или создать) ───────────────
  router.post('/users/telegram/:telegramId', (req: Request, res: Response) => {
    const user = users.findOrCreateByTelegramId(req.params.telegramId);
    res.json(user);
  });

  router.get('/users/telegram/:telegramId', (req: Request, res: Response) => {
    const user = users.findByTelegramId(req.params.telegramId);
    if (!user) return void res.status(404).json({ error: 'User not found' });
    res.json(user);
  });

  return router;
}
