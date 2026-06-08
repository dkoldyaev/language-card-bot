import { Router, Request, Response } from 'express';
import { UserRepository } from '@ecb/core-service';
import { WordRepository } from '@ecb/core-service';
import { WordEnrichmentOrchestrator } from '@ecb/core-service';
import {
  AddWordRequest,
  UpdateSettingsRequest,
  UpdateDefinitionRequest,
  Language,
  CefrLevel,
} from '@ecb/shared';

/**
 * REST API Router
 *
 * Маршруты соответствуют путям в openapi.ts.
 * Логика делегируется в репозитории core-service (monolith-режим).
 *
 * TODO: Добавить middleware авторизации (JWT).
 * TODO: Добавить валидацию тела запроса (zod / ajv).
 */
export function createApiRouter(
  users: UserRepository,
  words: WordRepository,
  orchestrator: WordEnrichmentOrchestrator
): Router {
  const router = Router();

  // ── Health ────────────────────────────────────────────────────────────────
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'rest-api', ts: new Date().toISOString() });
  });

  // ── Users ─────────────────────────────────────────────────────────────────

  /** POST /users/telegram/:telegramId — найти или создать пользователя */
  router.post('/users/telegram/:telegramId', (req: Request, res: Response) => {
    const user = users.findOrCreateByTelegramId(req.params.telegramId);
    res.json(user);
  });

  // ── Settings ──────────────────────────────────────────────────────────────

  /** GET /users/:userId/settings */
  router.get('/users/:userId/settings', (req: Request, res: Response) => {
    const user = users.findById(req.params.userId);
    if (!user) return void res.status(404).json({ error: 'User not found' });
    res.json(user.settings);
  });

  /** PUT /users/:userId/settings */
  router.put('/users/:userId/settings', (req: Request, res: Response) => {
    const body = req.body as UpdateSettingsRequest;
    try {
      if (body.baseLanguage && !Object.values(Language).includes(body.baseLanguage)) {
        return void res.status(400).json({ error: `Invalid baseLanguage: ${body.baseLanguage}` });
      }
      if (body.learnedLanguage && !Object.values(Language).includes(body.learnedLanguage)) {
        return void res
          .status(400)
          .json({ error: `Invalid learnedLanguage: ${body.learnedLanguage}` });
      }
      if (body.level && !Object.values(CefrLevel).includes(body.level)) {
        return void res.status(400).json({ error: `Invalid level: ${body.level}` });
      }
      const user = users.updateSettings(req.params.userId, body);
      res.json(user.settings);
    } catch (err: unknown) {
      res.status(404).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ── Words ─────────────────────────────────────────────────────────────────

  /** GET /users/:userId/words */
  router.get('/users/:userId/words', (req: Request, res: Response) => {
    const user = users.findById(req.params.userId);
    if (!user) return void res.status(404).json({ error: 'User not found' });
    res.json(words.findByUserId(req.params.userId));
  });

  /** POST /users/:userId/words */
  router.post('/users/:userId/words', (req: Request, res: Response) => {
    const { text } = req.body as AddWordRequest;
    if (!text?.trim()) return void res.status(400).json({ error: 'text is required' });

    const user = users.findById(req.params.userId);
    if (!user) return void res.status(404).json({ error: 'User not found' });

    const existing = words.findByUserIdAndText(req.params.userId, text);
    if (existing) {
      return void res.status(409).json({ error: 'Word already exists', word: existing });
    }

    const word = words.create(req.params.userId, text);
    orchestrator.enrich(word);
    res.status(201).json(word);
  });

  /** DELETE /users/:userId/words/:wordId */
  router.delete('/users/:userId/words/:wordId', (req: Request, res: Response) => {
    const word = words.findById(req.params.wordId);
    if (!word || word.userId !== req.params.userId) {
      return void res.status(404).json({ error: 'Word not found' });
    }
    words.delete(req.params.wordId);
    res.status(204).send();
  });

  // ── Definitions ───────────────────────────────────────────────────────────

  /** PUT /users/:userId/words/:wordId/definitions/:defId */
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
        res.status(404).json({ error: err instanceof Error ? err.message : String(err) });
      }
    }
  );

  return router;
}
