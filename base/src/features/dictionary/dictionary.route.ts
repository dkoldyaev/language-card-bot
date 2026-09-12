import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { getAuthUser } from '../auth/auth.service';
import { ensureActiveDictionary } from '../dictionaries/dictionaries.service';

const router = Router();

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const { id: userId } = getAuthUser(req);
  const queryDictId = req.query.dictionaryId ? parseInt(req.query.dictionaryId as string, 10) : undefined;

  try {
    let dict;
    if (queryDictId && !isNaN(queryDictId)) {
      dict = await prisma.dictionary.findFirst({
        where: { id: queryDictId, userId },
      });
      if (!dict) {
        return res.status(404).json({ error: 'Dictionary not found' });
      }
    } else {
      dict = await ensureActiveDictionary(userId);
    }

    const dictionary = await prisma.word.findMany({
      where: { dictionaryId: dict.id },
      include: {
        presets: {
          select: {
            id: true,
            title: true,
          },
        },
        definitions: {
          include: {
            translation: true,
            presets: {
              select: {
                id: true,
                title: true,
              },
            },
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

    res.json({
      dictionary,
      activeDictionaryId: dict.id,
      dictionaryInfo: {
        id: dict.id,
        name: dict.name,
        targetLanguage: dict.targetLanguage,
        baseLanguage: dict.baseLanguage,
      },
    });
  } catch (error) {
    console.error('Fetch dictionary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
