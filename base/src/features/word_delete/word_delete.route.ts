import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { getAuthUser } from '../auth/auth.service';
import { invalidateDashboardCache } from '../dashboard/dashboard.service';

const router = Router();

router.post('/bulk', authMiddleware, async (req: Request<{}, {}, { wordIds: number[] }>, res: Response) => {
  const { id: userId } = getAuthUser(req);
  const { wordIds } = req.body;

  if (!wordIds || !Array.isArray(wordIds)) {
    return res.status(400).json({ error: 'wordIds array is required' });
  }

  try {
    await prisma.word.deleteMany({
      where: {
        id: {
          in: wordIds
        },
        dictionary: {
          userId: userId
        }
      }
    });

    await invalidateDashboardCache(userId);

    res.json({ message: 'Words deleted successfully' });
  } catch (error) {
    console.error('Bulk delete word error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:wordId', authMiddleware, async (req: Request<{ wordId: string }>, res: Response) => {
  const { id: userId } = getAuthUser(req);
  const wordId = parseInt(req.params.wordId, 10);

  if (isNaN(wordId)) {
    return res.status(400).json({ error: 'Invalid wordId' });
  }

  try {
    const existingWord = await prisma.word.findUnique({
      where: {
        id: wordId
      },
      include: {
        dictionary: true
      }
    });

    if (!existingWord) {
      return res.status(404).json({ error: 'Word not found' });
    }

    if (existingWord.dictionary.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.word.delete({
      where: {
        id: wordId
      }
    });

    await invalidateDashboardCache(userId, existingWord.dictionaryId);

    res.json({ message: 'Word deleted successfully' });
  } catch (error) {
    console.error('Delete word error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
