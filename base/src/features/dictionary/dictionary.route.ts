import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { getAuthUser } from '../auth/auth.service';

const router = Router();

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const { id: userId } = getAuthUser(req);

  try {
    const dictionary = await prisma.word.findMany({
      where: { userId },
      include: {
        definitions: {
          include: {
            translation: true
          },
          orderBy: {
            id: 'asc'
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });

    res.json({ dictionary });
  } catch (error) {
    console.error('Fetch dictionary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
