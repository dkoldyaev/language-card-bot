import { type Request, type Response, Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { getAuthUser } from '../auth/auth.service';
import { getUserFeatureFlags } from '../user_features/user_features.service';

const router = Router();

router.delete('/:definitionId/:imageId', authMiddleware, async (req: Request<{ definitionId: string, imageId: string }>, res: Response) => {
  const { id: userId } = getAuthUser(req);
  const definitionId = parseInt(req.params.definitionId, 10);
  const imageId = parseInt(req.params.imageId, 10);

  if (Number.isNaN(definitionId) || Number.isNaN(imageId)) {
    return res.status(400).json({ error: 'Invalid definition ID or image ID' });
  }

  try {
    const features = await getUserFeatureFlags(userId);
    if (!features.cardImages) {
      return res.status(403).json({ error: 'Card images feature is disabled' });
    }

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

    await prisma.definition.update({
      where: { id: definitionId },
      data: {
        images: {
          disconnect: { id: imageId }
        }
      }
    });

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
