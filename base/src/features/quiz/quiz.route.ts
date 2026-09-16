import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { getAuthUser } from '../auth/auth.service';
import { prisma } from '../../prisma';
import { publishEvent } from '../event_bus/event_bus.service';
import { QuizCardMercureEvent, QuizVariantsMercureEvent, QuizDefinitionTranslationMercureEvent, QuizAnswerEvaluationMercureEvent } from '../event_bus/event_bus.type';
import { generateQuizCard, getQuizVariants, getNextDefinition } from './quiz.service';
import { evaluateSuggestion } from './evaluation.service';
import { ensureActiveDictionary } from '../dictionaries/dictionaries.service';
import { invalidateDashboardCache } from '../dashboard/dashboard.service';

const router = Router();

router.post('/start', authMiddleware, async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  
  try {
    const dict = await ensureActiveDictionary(user.id);
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
        translation: cardData.definition.translation?.text || null
      }
    };
    
    await publishEvent(user.username, event).catch((e) => console.error('Mercure publish error:', e));

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
    
    if (!userState || !userState.currentWordId) {
      return res.status(400).json({ error: 'Quiz not active or current word not set' });
    }

    const dictId = userState.activeDictionaryId || (await ensureActiveDictionary(user.id)).id;
    const variants = await getQuizVariants(user.id, dictId, userState.currentWordId);

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

router.post('/translate_definition', authMiddleware, async (req: Request, res: Response) => {
  const user = getAuthUser(req);

  try {
    const userState = await prisma.userState.findUnique({ where: { userId: user.id } });

    if (!userState || !userState.currentDefinitionId) {
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

    await publishEvent(user.username, event).catch((e) => console.error('Mercure publish error:', e));

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

    if (!userState || !userState.currentWordId) {
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

router.post('/next_card', authMiddleware, async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  
  try {
    const userState = await prisma.userState.findUnique({ where: { userId: user.id } });
    if (!userState) {
      return res.status(400).json({ error: 'Quiz not active' });
    }

    const dictId = userState.activeDictionaryId || (await ensureActiveDictionary(user.id)).id;
    const cardData = await generateQuizCard(user.id, dictId, userState.currentWordId || undefined);
    
    if (!cardData) {
      return res.status(400).json({ error: 'Not enough words to pick a new card' });
    }

    await prisma.userState.update({
      where: { userId: user.id },
      data: {
        activeDictionaryId: dictId,
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
    
    await publishEvent(user.username, event).catch((e) => console.error('Mercure publish error:', e));
    res.json({ message: 'Next card generated', card: event });
  } catch (error) {
    console.error('Failed to generate next quiz card:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/next_definition', authMiddleware, async (req: Request, res: Response) => {
  const user = getAuthUser(req);

  try {
    const userState = await prisma.userState.findUnique({ where: { userId: user.id } });
    if (!userState || !userState.currentWordId || !userState.currentDefinitionId) {
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
        translation: definition.translation?.text || null
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
