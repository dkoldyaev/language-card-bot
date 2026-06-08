import { Router, Request, Response } from 'express';
import { UserRepository, WordRepository, WordEnrichmentOrchestrator } from '@ecb/core-service';
import { WordStatus } from '@ecb/shared';
import {
  asyncHandler,
  NotFoundError,
  ConflictError,
  validate,
} from '../middleware/errors';
import {
  AddWordSchema,
  AddWordsSchema,
  WordsFilterSchema,
  UpdateDefinitionSchema,
} from '../validation';

/**
 * Роутер словаря.
 *
 * GET    /api/users/:userId/words                              — список слов
 * POST   /api/users/:userId/words                              — добавить одно слово
 * POST   /api/users/:userId/words/batch                        — добавить несколько слов
 * GET    /api/users/:userId/words/:wordId                      — слово по ID
 * DELETE /api/users/:userId/words/:wordId                      — удалить слово
 * PUT    /api/users/:userId/words/:wordId/definitions/:defId   — редактировать определение
 */
export function createWordsRouter(
  users: UserRepository,
  words: WordRepository,
  orchestrator: WordEnrichmentOrchestrator
): Router {
  const router = Router({ mergeParams: true });

  // ── GET /words ────────────────────────────────────────────────────────────

  router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      const user = users.findById(req.params.userId);
      if (!user) throw new NotFoundError('Пользователь', req.params.userId);

      const filter = validate(WordsFilterSchema, req.query);
      let result = words.findByUserId(req.params.userId);

      // Фильтрация по статусу
      if (filter.status) {
        result = result.filter((w) => w.status === filter.status);
      }

      // Поиск по тексту слова
      if (filter.search) {
        const term = filter.search.toLowerCase();
        result = result.filter(
          (w) =>
            w.text.toLowerCase().includes(term) ||
            w.translation.toLowerCase().includes(term)
        );
      }

      const total = result.length;
      const limit: number = filter.limit ?? 50;
      const offset: number = filter.offset ?? 0;
      const page = result.slice(offset, offset + limit);

      res.json({
        data: page,
        meta: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      });
    })
  );

  // ── GET /words/:wordId ────────────────────────────────────────────────────

  router.get(
    '/:wordId',
    asyncHandler(async (req: Request, res: Response) => {
      const word = words.findById(req.params.wordId);
      if (!word || word.userId !== req.params.userId) {
        throw new NotFoundError('Слово', req.params.wordId);
      }
      res.json(word);
    })
  );

  // ── POST /words ───────────────────────────────────────────────────────────

  router.post(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      const user = users.findById(req.params.userId);
      if (!user) throw new NotFoundError('Пользователь', req.params.userId);

      const { text } = validate(AddWordSchema, req.body);
      const existing = words.findByUserIdAndText(req.params.userId, text);
      if (existing) {
        throw new ConflictError(`Слово '${text}' уже есть в словаре`, existing);
      }

      const word = words.create(req.params.userId, text);
      orchestrator.enrich(word);
      res.status(201).json(word);
    })
  );

  // ── POST /words/batch ─────────────────────────────────────────────────────

  router.post(
    '/batch',
    asyncHandler(async (req: Request, res: Response) => {
      const user = users.findById(req.params.userId);
      if (!user) throw new NotFoundError('Пользователь', req.params.userId);

      const { words: wordTexts } = validate(AddWordsSchema, req.body);

      const results = wordTexts.map((text) => {
        const existing = words.findByUserIdAndText(req.params.userId, text);
        if (existing) {
          return { text, word: existing, duplicate: true };
        }
        const word = words.create(req.params.userId, text);
        orchestrator.enrich(word);
        return { text, word, duplicate: false };
      });

      const created = results.filter((r) => !r.duplicate).length;
      const duplicates = results.filter((r) => r.duplicate).length;

      res.status(207).json({
        results,
        summary: { total: results.length, created, duplicates },
      });
    })
  );

  // ── DELETE /words/:wordId ─────────────────────────────────────────────────

  router.delete(
    '/:wordId',
    asyncHandler(async (req: Request, res: Response) => {
      const word = words.findById(req.params.wordId);
      if (!word || word.userId !== req.params.userId) {
        throw new NotFoundError('Слово', req.params.wordId);
      }
      words.delete(req.params.wordId);
      res.status(204).send();
    })
  );

  // ── PUT /words/:wordId/definitions/:defId ─────────────────────────────────

  router.put(
    '/:wordId/definitions/:defId',
    asyncHandler(async (req: Request, res: Response) => {
      let word = words.findById(req.params.wordId);
      if (!word || word.userId !== req.params.userId) {
        throw new NotFoundError('Слово', req.params.wordId);
      }

      const def = word.definitions.find((d) => d.id === req.params.defId);
      if (!def) throw new NotFoundError('Определение', req.params.defId);

      const body = validate(UpdateDefinitionSchema, req.body);

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
    })
  );

  return router;
}
