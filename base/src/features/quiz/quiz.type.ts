import { z } from 'zod';

export const QuizStartSchema = z.object({
  dictionaryId: z.number(),
});
export type QuizStartRequest = z.infer<typeof QuizStartSchema>;

export const QuizVariantsSchema = z.object({
  dictionaryId: z.number(),
});
export type QuizVariantsRequest = z.infer<typeof QuizVariantsSchema>;

export const QuizAnswerSchema = z.object({
  dictionaryId: z.number(),
  suggestion: z.string().trim().min(1, 'Suggestion must be a non-empty string'),
});
export type QuizAnswerRequest = z.infer<typeof QuizAnswerSchema>;

export const QuizNextCardSchema = z.object({
  dictionaryId: z.number(),
});
export type QuizNextCardRequest = z.infer<typeof QuizNextCardSchema>;

export const QuizNextDefinitionSchema = z.object({
  dictionaryId: z.number(),
});
export type QuizNextDefinitionRequest = z.infer<typeof QuizNextDefinitionSchema>;

export const QuizTranslateDefinitionSchema = z.object({
  dictionaryId: z.number(),
});
export type QuizTranslateDefinitionRequest = z.infer<typeof QuizTranslateDefinitionSchema>;
