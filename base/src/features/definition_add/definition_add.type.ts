import { z } from 'zod';

export const DefinitionAddRequestSchema = z.object({
  wordId: z.number().int().positive(),
  text: z.string().min(1).max(500)
});

export type DefinitionAddRequest = z.infer<typeof DefinitionAddRequestSchema>;

export type DefinitionAddResponse = {
  message: string;
  definitionId?: number;
};
