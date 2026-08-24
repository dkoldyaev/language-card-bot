import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { getAuthUser } from '../auth/auth.service';
import { prisma } from '../../prisma';
import { publishEvent } from '../event_bus/event_bus.service';
import { QuizCardMercureEvent, QuizVariantsMercureEvent, QuizDefinitionTranslationMercureEvent, QuizAnswerEvaluationMercureEvent } from '../event_bus/event_bus.type';
import { generateQuizCard, getQuizVariants } from './quiz.service';
import { evaluateSuggestion } from './evaluation.service';
import { enqueueQuizCleanup } from './quiz_cleanup.queue';
import { UserMode } from '@prisma/client';

const router = Router();

router.post('/start', authMiddleware, async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  
  try {
    const cardData = await generateQuizCard(user.id);
    
    if (!cardData) {
      return res.status(400).json({ error: 'Not enough words in dictionary to start quiz' });
    }

    await prisma.userState.update({
      where: { userId: user.id },
      data: {
        mode: UserMode.QUIZ,
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
        translation: cardData.definition.translation?.text || null
      }
    };
    
    await publishEvent(user.username, event);

    res.json({ message: 'Quiz started', card: event });
  } catch (error) {
    console.error('Failed to start quiz:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/variants', authMiddleware, async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  
  try {
    const userState = await prisma.userState.findUnique({ where: { userId: user.id } });
    
    if (!userState || userState.mode !== UserMode.QUIZ || !userState.currentWordId) {
      return res.status(400).json({ error: 'Quiz not active or current word not set' });
    }

    const variants = await getQuizVariants(user.id, userState.currentWordId);

    await prisma.userState.update({
      where: { userId: user.id },
      data: { showVariants: true }
    });

    const event: QuizVariantsMercureEvent = {
      version: 'v1',
      type: 'quiz_variants',
      variants
    };

    await publishEvent(user.username, event);

    res.json({ message: 'Variants fetched', variants });
  } catch (error) {
    console.error('Failed to get quiz variants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/translate_definition', authMiddleware, async (req: Request, res: Response) => {
  const user = getAuthUser(req);

  try {
    const userState = await prisma.userState.findUnique({ where: { userId: user.id } });

    if (!userState || userState.mode !== UserMode.QUIZ || !userState.currentDefinitionId) {
      return res.status(400).json({ error: 'Quiz not active or current definition not set' });
    }

    const definition = await prisma.definition.findUnique({
      where: { id: userState.currentDefinitionId },
      include: { translation: true }
    });

    if (!definition || !definition.translation) {
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

    await publishEvent(user.username, event);

    res.json({ message: 'Translation fetched', translation: definition.translation.text });
  } catch (error) {
    console.error('Failed to get definition translation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/answer', authMiddleware, async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const { suggestion } = req.body;

  if (typeof suggestion !== 'string' || !suggestion.trim()) {
    return res.status(400).json({ error: 'Suggestion must be a non-empty string' });
  }

  try {
    const userState = await prisma.userState.findUnique({ where: { userId: user.id } });

    if (!userState || userState.mode !== UserMode.QUIZ || !userState.currentWordId) {
      return res.status(400).json({ error: 'Quiz not active or current word not set' });
    }

    const word = await prisma.word.findUnique({
      where: { id: userState.currentWordId }
    });

    if (!word) {
      return res.status(404).json({ error: 'Word not found' });
    }

    const result = evaluateSuggestion(suggestion, word.text);
    let emoji = '❌';
    if (result === 'SUCCESS') emoji = '✅';
    else if (result === 'CLOSE_MATCH') emoji = '⚠️';

    const event: QuizAnswerEvaluationMercureEvent = {
      version: 'v1',
      type: 'quiz_answer_evaluation',
      result,
      emoji,
      suggestion: suggestion.trim()
    };

    await publishEvent(user.username, event);
    await enqueueQuizCleanup(user.username);

    res.json({ message: 'Answer evaluated', evaluation: event });
  } catch (error) {
    console.error('Failed to evaluate quiz answer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
