import { z } from 'zod';

export const DefinitionTranslateEditRequestSchema = z.object({
  text: z.string().min(1, 'Translation text must not be empty')
});

export type DefinitionTranslateEditRequest = z.infer<typeof DefinitionTranslateEditRequestSchema>;
