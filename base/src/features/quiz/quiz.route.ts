import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { getAuthUser } from '../auth/auth.service';
import { prisma } from '../../prisma';
import { publishEvent } from '../event_bus/event_bus.service';
import { QuizCardMercureEvent } from '../event_bus/event_bus.type';
import { generateQuizCard } from './quiz.service';
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

export default router;
