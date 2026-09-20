import { type Request, type Response, Router } from 'express';
import { appEvents, Events } from '../../core/events';
import { authMiddleware } from '../../middleware/auth';
import { prisma } from '../../prisma';
import { getAuthUser } from '../auth/auth.service';
import { DefinitionTranslateEditRequestSchema } from './definition_translate_edit.type';

const router = Router();

router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  const parseResult = DefinitionTranslateEditRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const { text } = parseResult.data;
  const { id: userId, username } = getAuthUser(req);
  const definitionId = parseInt(req.params.id as string, 10);

  if (Number.isNaN(definitionId)) {
    return res.status(400).json({ error: 'Invalid definition ID' });
  }

  try {
    const definition = await prisma.definition.findUnique({
      where: { id: definitionId },
      include: {
        word: {
          include: { dictionary: true }
        },
        translation: true
      }
    });

    if (!definition) {
      return res.status(404).json({ error: 'Definition not found' });
    }

    if (definition.word.dictionary.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (definition.translation) {
      await prisma.definitionTranslation.update({
        where: { id: definition.translation.id },
        data: { text }
      });
    } else {
      await prisma.definitionTranslation.create({
        data: {
          definitionId: definitionId,
          text: text
        }
      });
    }

    appEvents.emit(Events.TRANSLATION_ADDED, {
      username,
      wordId: definition.wordId,
      definitions: [{ id: definitionId, translation: text }]
    });

    res.json({ message: 'Definition translation edited successfully' });
  } catch (error) {
    console.error('Edit definition translation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
