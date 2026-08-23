import { z } from 'zod';

export const DefinitionEditRequestSchema = z.object({
  text: z.string().min(1).max(500)
});

export type DefinitionEditRequest = z.infer<typeof DefinitionEditRequestSchema>;

export type DefinitionEditResponse = {
  message: string;
};
