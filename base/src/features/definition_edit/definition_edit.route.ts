import { type Request, type Response, Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { prisma } from '../../prisma';
import type { LanguageCode } from '../../types/language';
import { enqueueFetchTranslations } from '../add_word/add_word.queue';
import { getAuthUser } from '../auth/auth.service';
import { DefinitionEditRequestSchema } from './definition_edit.type';

const router = Router();

router.put('/:id', authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  const parseResult = DefinitionEditRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const { text } = parseResult.data;
  const { id: userId, username } = getAuthUser(req);
  const definitionId = parseInt(req.params.id, 10);

  if (Number.isNaN(definitionId)) {
    return res.status(400).json({ error: 'Invalid definition ID' });
  }

  try {
    const definition = await prisma.definition.findUnique({
      where: { id: definitionId },
      include: {
        word: {
          include: {
            definitions: true,
            dictionary: true
          }
        }
      }
    });

    if (!definition) {
      return res.status(404).json({ error: 'Definition not found' });
    }

    if (definition.word.dictionary.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updatedDefinition = await prisma.definition.update({
      where: { id: definitionId },
      data: { text }
    });

    await enqueueFetchTranslations(
      [{ id: updatedDefinition.id, text: updatedDefinition.text }],
      userId,
      username,
      definition.word.id,
      definition.word.text,
      definition.word.dictionary.targetLanguage as LanguageCode,
      definition.word.dictionary.baseLanguage as LanguageCode
    );

    res.json({ message: 'Definition edited successfully' });
  } catch (error) {
    console.error('Edit definition error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
