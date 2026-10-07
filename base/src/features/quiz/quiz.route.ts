import { type Request, type Response, Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validate';
import { prisma } from '../../prisma';
import { getAuthUser } from '../auth/auth.service';
import { invalidateDashboardCache } from '../dashboard/dashboard.service';
import { publishEvent } from '../event_bus/event_bus.service';
import type { QuizAnswerEvaluationMercureEvent, QuizCardMercureEvent, QuizDefinitionTranslationMercureEvent, QuizVariantsMercureEvent } from '../event_bus/event_bus.type';
import { evaluateSuggestion } from './evaluation.service';
import { generateQuizCard, getNextDefinition, getQuizVariants } from './quiz.service';
import { type QuizAnswerRequest,
  QuizAnswerSchema, type QuizNextCardRequest,
  QuizNextCardSchema, type QuizNextDefinitionRequest,
  QuizNextDefinitionSchema, type QuizStartRequest,
  QuizStartSchema, type QuizTranslateDefinitionRequest, 
  QuizTranslateDefinitionSchema, type QuizVariantsRequest,
  QuizVariantsSchema 
} from './quiz.type';

const router = Router();

router.post('/start', authMiddleware, validateRequest(QuizStartSchema), async (req: Request<Record<string, string>, unknown, QuizStartRequest>, res: Response) => {
  const user = getAuthUser(req);
  
  try {
    const { dictionaryId } = req.body;
    
    const dict = await prisma.dictionary.findFirst({
      where: { id: dictionaryId, userId: user.id }
    });

    if (!dict) {
      return res.status(404).json({ error: 'Dictionary not found' });
    }

    const cardData = await generateQuizCard(user.id, dict.id);
    
    if (!cardData) {
      return res.status(400).json({ error: 'Not enough words in dictionary to start quiz' });
    }

    await prisma.userState.update({
      where: { userId: user.id },
      data: {
        activeDictionaryId: dict.id,
        showVariants: false,
        showDefinitionTranslation: false,
        currentDefinitionId: cardData.definition.id,
        currentWordId: cardData.word.id
      }
    });

    const event: QuizCardMercureEvent = {
      version: 'v1',
      type: 'quiz_card',
      wordId: cardData.word.id,
      definition: {
        id: cardData.definition.id,
        text: cardData.definition.text,
        translation: cardData.definition.translation ? cardData.definition.translation.text : null,
        images: Array.isArray(cardData.definition.images)
          ? cardData.definition.images.map((img) => ({ id: img.id, url: img.url, source: img.source }))
          : [],
      }
    };
    
    await publishEvent(user.username, event).catch((e) => console.error('Mercure publish error:', e));

    res.json({ message: 'Quiz started', card: event });
  } catch (error) {
    console.error('Failed to start quiz:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/variants', authMiddleware, validateRequest(QuizVariantsSchema), async (req: Request<Record<string, string>, unknown, QuizVariantsRequest>, res: Response) => {
  const user = getAuthUser(req);
  
  try {
    const userState = await prisma.userState.findUnique({ where: { userId: user.id } });
    
    if (!userState?.currentWordId) {
      return res.status(400).json({ error: 'Quiz not active or current word not set' });
    }

    const { dictionaryId } = req.body;
    const variants = await getQuizVariants(user.id, dictionaryId, userState.currentWordId);

    await prisma.userState.update({
      where: { userId: user.id },
      data: { showVariants: true }
    });

    const event: QuizVariantsMercureEvent = {
      version: 'v1',
      type: 'quiz_variants',
      variants
    };

    await publishEvent(user.username, event).catch((e) => console.error('Mercure publish error:', e));

    res.json({ message: 'Variants fetched', variants });
  } catch (error) {
    console.error('Failed to get quiz variants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/translate_definition', authMiddleware, validateRequest(QuizTranslateDefinitionSchema), async (req: Request<Record<string, string>, unknown, QuizTranslateDefinitionRequest>, res: Response) => {
  const user = getAuthUser(req);

  try {
    const userState = await prisma.userState.findUnique({ where: { userId: user.id } });

    if (!userState?.currentDefinitionId) {
      return res.status(400).json({ error: 'Quiz not active or current definition not set' });
    }

    const definition = await prisma.definition.findUnique({
      where: { id: userState.currentDefinitionId },
      include: { translation: true }
    });

    if (!definition) {
      return res.status(404).json({ error: 'Current definition not found' });
    }

    if (!definition.translation) {
      return res.status(404).json({ error: 'Translation not found for current definition' });
    }

    await prisma.userState.update({
      where: { userId: user.id },
      data: { showDefinitionTranslation: true }
    });

    const event: QuizDefinitionTranslationMercureEvent = {
      version: 'v1',
      type: 'quiz_definition_translation',
      translation: definition.translation.text
    };

    await publishEvent(user.username, event).catch((e) => console.error('Mercure publish error:', e));

    res.json({ message: 'Translation fetched', translation: definition.translation.text });
  } catch (error) {
    console.error('Failed to get definition translation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/answer', authMiddleware, validateRequest(QuizAnswerSchema), async (req: Request<Record<string, string>, unknown, QuizAnswerRequest>, res: Response) => {
  const user = getAuthUser(req);
  const { suggestion } = req.body;
  try {
    const userState = await prisma.userState.findUnique({ where: { userId: user.id } });

    if (!userState?.currentWordId) {
      return res.status(400).json({ error: 'Quiz not active or current word not set' });
    }

    const word = await prisma.word.findUnique({
      where: { id: userState.currentWordId }
    });

    if (!word) {
      return res.status(404).json({ error: 'Word not found' });
    }

    const result = evaluateSuggestion(suggestion, word.text);

    await prisma.quizAttempt.create({
      data: {
        userId: user.id,
        wordId: word.id,
        result,
      },
    });

    await invalidateDashboardCache(user.id, word.dictionaryId);

    const event: QuizAnswerEvaluationMercureEvent = {
      version: 'v1',
      type: 'quiz_answer_evaluation',
      result,
      suggestion: suggestion.trim()
    };

    await publishEvent(user.username, event).catch((e) => console.error('Mercure publish error:', e));

    res.json({ message: 'Answer evaluated', evaluation: event });
  } catch (error) {
    console.error('Failed to evaluate quiz answer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/next_card', authMiddleware, validateRequest(QuizNextCardSchema), async (req: Request<Record<string, string>, unknown, QuizNextCardRequest>, res: Response) => {
  const user = getAuthUser(req);
  
  try {
    const { dictionaryId } = req.body;
    const userState = await prisma.userState.findUnique({ where: { userId: user.id } });
    if (!userState) {
      return res.status(400).json({ error: 'Quiz not active' });
    }

    const cardData = await generateQuizCard(user.id, dictionaryId, userState.currentWordId || undefined);
    
    if (!cardData) {
      return res.status(400).json({ error: 'Not enough words to pick a new card' });
    }

    await prisma.userState.update({
      where: { userId: user.id },
      data: {
        activeDictionaryId: dictionaryId,
        showVariants: false,
        showDefinitionTranslation: false,
        currentDefinitionId: cardData.definition.id,
        currentWordId: cardData.word.id
      }
    });

    const event: QuizCardMercureEvent = {
      version: 'v1',
      type: 'quiz_card',
      wordId: cardData.word.id,
      definition: {
        id: cardData.definition.id,
        text: cardData.definition.text,
        translation: cardData.definition.translation ? cardData.definition.translation.text : null,
        images: Array.isArray(cardData.definition.images)
          ? cardData.definition.images.map((img) => ({ id: img.id, url: img.url, source: img.source }))
          : [],
      }
    };
    
    await publishEvent(user.username, event).catch((e) => console.error('Mercure publish error:', e));
    res.json({ message: 'Next card generated', card: event });
  } catch (error) {
    console.error('Failed to generate next quiz card:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/next_definition', authMiddleware, validateRequest(QuizNextDefinitionSchema), async (req: Request<Record<string, string>, unknown, QuizNextDefinitionRequest>, res: Response) => {
  const user = getAuthUser(req);

  try {
    const userState = await prisma.userState.findUnique({ where: { userId: user.id } });
    if (!userState?.currentWordId || !userState.currentDefinitionId) {
      return res.status(400).json({ error: 'Quiz not active or current word/definition not set' });
    }

    const definition = await getNextDefinition(userState.currentWordId, userState.currentDefinitionId);

    if (!definition) {
      return res.status(404).json({ error: 'Definition not found' });
    }

    await prisma.userState.update({
      where: { userId: user.id },
      data: {
        showVariants: false,
        showDefinitionTranslation: false,
        currentDefinitionId: definition.id
      }
    });

    const event: QuizCardMercureEvent = {
      version: 'v1',
      type: 'quiz_card',
      wordId: userState.currentWordId,
      definition: {
        id: definition.id,
        text: definition.text,
        translation: definition.translation ? definition.translation.text : null,
        images: Array.isArray(definition.images)
          ? definition.images.map((img) => ({ id: img.id, url: img.url, source: img.source }))
          : [],
      }
    };

    await publishEvent(user.username, event).catch((e) => console.error('Mercure publish error:', e));
    res.json({ message: 'Next definition fetched', card: event });
  } catch (error) {
    console.error('Failed to fetch next definition:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
