import { Router, Request, Response } from 'express';
import { QuizService } from '../services/QuizService';
import { QuizAction, QuizActionRequest, QuizAnswerRequest } from '@ecb/shared';

/**
 * HTTP API для Quiz-режима.
 *
 * Маршруты (префикс /users/:userId/quiz):
 *   POST   /start    — начать/перезапустить квиз, вернуть первую карточку
 *   GET    /card     — получить текущую карточку
 *   POST   /answer   — проверить ответ пользователя
 *   POST   /action   — действие на карточке (show_variants, translate_definition, ...)
 */
export function createQuizRouter(quiz: QuizService): Router {
  const router = Router({ mergeParams: true });

  // ── POST /start ───────────────────────────────────────────────────────────

  /**
   * Запустить квиз. Создаёт сессию и возвращает первую карточку.
   * 404 если в словаре нет слов с определениями.
   */
  router.post('/start', (req: Request, res: Response) => {
    const card = quiz.start(req.params.userId);
    if (!card) {
      return void res.status(404).json({
        error: 'No words available for quiz',
        hint: 'Add words to the dictionary and wait for them to be processed',
      });
    }
    res.json(card);
  });

  // ── GET /card ─────────────────────────────────────────────────────────────

  /**
   * Получить текущую карточку без изменения состояния.
   * 404 если сессии нет — нужно вызвать POST /start.
   */
  router.get('/card', (req: Request, res: Response) => {
    const card = quiz.currentCard(req.params.userId);
    if (!card) {
      return void res.status(404).json({
        error: 'No active quiz session',
        hint: 'Call POST /start to begin a quiz',
      });
    }
    res.json(card);
  });

  // ── POST /answer ──────────────────────────────────────────────────────────

  /**
   * Принять ответ пользователя.
   *
   * Body: { suggestion: string }
   *
   * Response: QuizAnswerResult
   *   verdict: 'correct' | 'close' | 'wrong'
   *   correctWord: string   (всегда раскрывается после проверки)
   *   nextCard: QuizCard | null   (null если остаёмся на той же карточке)
   *   streak: number
   */
  router.post('/answer', (req: Request, res: Response) => {
    const { suggestion } = req.body as QuizAnswerRequest;

    if (!suggestion || !String(suggestion).trim()) {
      return void res.status(400).json({ error: 'suggestion is required' });
    }

    const result = quiz.answer(req.params.userId, String(suggestion));
    if (!result) {
      return void res.status(404).json({ error: 'No active quiz session' });
    }

    res.json(result);
  });

  // ── POST /action ──────────────────────────────────────────────────────────

  /**
   * Действие на карточке.
   *
   * Body: { action: 'show_variants' | 'translate_definition' | 'another_card' | 'another_definition' }
   *
   * Response: обновлённая QuizCard
   */
  router.post('/action', (req: Request, res: Response) => {
    const { action } = req.body as QuizActionRequest;

    if (!action || !Object.values(QuizAction).includes(action as QuizAction)) {
      return void res.status(400).json({
        error: `Invalid action. Valid values: ${Object.values(QuizAction).join(', ')}`,
      });
    }

    const card = quiz.performAction(req.params.userId, action as QuizAction);
    if (!card) {
      return void res.status(404).json({ error: 'No active quiz session' });
    }

    res.json(card);
  });

  return router;
}
