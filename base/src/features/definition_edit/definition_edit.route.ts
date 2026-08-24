import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { DefinitionEditRequestSchema } from './definition_edit.type';
import { getAuthUser } from '../auth/auth.service';
import { enqueueFetchTranslation } from '../add_word/add_word.queue';

const router = Router();

router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  const parseResult = DefinitionEditRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const { text } = parseResult.data;
  const { id: userId, username } = getAuthUser(req);
  const definitionId = parseInt(req.params.id as string, 10);

  if (isNaN(definitionId)) {
    return res.status(400).json({ error: 'Invalid definition ID' });
  }

  try {
    const definition = await prisma.definition.findUnique({
      where: { id: definitionId },
      include: {
        word: {
          include: {
            definitions: true
          }
        }
      }
    });

    if (!definition) {
      return res.status(404).json({ error: 'Definition not found' });
    }

    if (definition.word.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updatedDefinition = await prisma.definition.update({
      where: { id: definitionId },
      data: { text }
    });

    const totalDefinitions = definition.word.definitions.length;

    await enqueueFetchTranslation(
      updatedDefinition.id,
      updatedDefinition.text,
      userId,
      username,
      definition.word.id,
      definition.word.text,
      totalDefinitions
    );

    res.json({ message: 'Definition edited successfully' });
  } catch (error) {
    console.error('Edit definition error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
