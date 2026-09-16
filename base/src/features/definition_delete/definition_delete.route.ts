import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { getAuthUser } from '../auth/auth.service';
import { invalidateDashboardCache } from '../dashboard/dashboard.service';

const router = Router();

router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id: userId } = getAuthUser(req);
  const definitionId = parseInt(req.params.id as string, 10);

  if (isNaN(definitionId)) {
    return res.status(400).json({ error: 'Invalid definition ID' });
  }

  try {
    const definition = await prisma.definition.findUnique({
      where: { id: definitionId },
      include: {
        word: {
          include: { dictionary: true }
        }
      }
    });

    if (!definition) {
      return res.status(404).json({ error: 'Definition not found' });
    }

    if (definition.word.dictionary.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.definition.delete({
      where: { id: definitionId }
    });

    await invalidateDashboardCache(userId, definition.word.dictionaryId);

    res.json({ message: 'Definition deleted successfully' });
  } catch (error) {
    console.error('Delete definition error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
