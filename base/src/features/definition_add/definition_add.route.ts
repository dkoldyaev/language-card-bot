import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { DefinitionAddRequestSchema } from './definition_add.type';
import { getAuthUser } from '../auth/auth.service';
import { enqueueFetchTranslation } from '../add_word/add_word.queue';

const router = Router();

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const parseResult = DefinitionAddRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const { wordId, text } = parseResult.data;
  const { id: userId, username } = getAuthUser(req);

  try {
    const word = await prisma.word.findFirst({
      where: {
        id: wordId,
        userId: userId
      },
      include: {
        definitions: true
      }
    });

    if (!word) {
      return res.status(404).json({ error: 'Word not found' });
    }

    const newDefinition = await prisma.definition.create({
      data: {
        wordId: word.id,
        text: text
      }
    });

    const totalDefinitions = word.definitions.length + 1;

    await enqueueFetchTranslation(
      newDefinition.id,
      newDefinition.text,
      userId,
      username,
      word.id,
      word.text,
      totalDefinitions
    );

    res.json({ message: 'Definition added successfully', definitionId: newDefinition.id });
  } catch (error) {
    console.error('Add definition error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
