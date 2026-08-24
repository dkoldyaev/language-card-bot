import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { getAuthUser } from '../auth/auth.service';
import { prisma } from '../../prisma';
import { publishEvent } from '../event_bus/event_bus.service';
import { QuizCardMercureEvent, QuizVariantsMercureEvent } from '../event_bus/event_bus.type';
import { generateQuizCard, getQuizVariants } from './quiz.service';
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

export default router;
