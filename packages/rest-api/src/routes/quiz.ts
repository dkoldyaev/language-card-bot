import { Router, Request, Response } from 'express';
import { QuizService } from '@ecb/core-service';
import { QuizAction, QuizActionRequest, QuizAnswerRequest } from '@ecb/shared';
import { asyncHandler, NotFoundError, validate } from '../middleware/errors';
import { z } from 'zod';

const AnswerSchema = z.object({
  suggestion: z.string({ required_error: 'suggestion обязателен' }).min(1, 'suggestion не может быть пустым'),
});

const ActionSchema = z.object({
  action: z.nativeEnum(QuizAction, {
    errorMap: () => ({
      message: `Допустимые значения: ${Object.values(QuizAction).join(', ')}`,
    }),
  }),
});

/**
 * Quiz роутер для rest-api.
 *
 * Смонтирован на /api/users/:userId/quiz (через router.ts).
 */
export function createQuizApiRouter(quiz: QuizService): Router {
  const router = Router({ mergeParams: true });

  /** POST /quiz/start — начать квиз */
  router.post(
    '/start',
    asyncHandler(async (req: Request, res: Response) => {
      const card = quiz.start(req.params.userId);
      if (!card) {
        throw new NotFoundError(
          'Нет слов для квиза. Добавьте слова в словарь и дождитесь их обработки'
        );
      }
      res.json(card);
    })
  );

  /** GET /quiz/card — текущая карточка */
  router.get(
    '/card',
    asyncHandler(async (req: Request, res: Response) => {
      const card = quiz.currentCard(req.params.userId);
      if (!card) throw new NotFoundError('Активная квиз-сессия');
      res.json(card);
    })
  );

  /** POST /quiz/answer — ответ пользователя */
  router.post(
    '/answer',
    asyncHandler(async (req: Request, res: Response) => {
      const { suggestion } = validate(AnswerSchema, req.body);
      const result = quiz.answer(req.params.userId, suggestion);
      if (!result) throw new NotFoundError('Активная квиз-сессия');
      res.json(result);
    })
  );

  /** POST /quiz/action — действие на карточке */
  router.post(
    '/action',
    asyncHandler(async (req: Request, res: Response) => {
      const { action } = validate(ActionSchema, req.body);
      const card = quiz.performAction(req.params.userId, action);
      if (!card) throw new NotFoundError('Активная квиз-сессия');
      res.json(card);
    })
  );

  return router;
}
