import { z } from 'zod';

export const AddWordSchema = z.object({
  word: z.string().trim().min(1, 'Word is required'),
  dictionaryId: z.number(),
});
export type AddWordRequest = z.infer<typeof AddWordSchema>;

export interface AddWordResponse {
  message: string;
}

export const AddWordBatchSchema = z.object({
  words: z.array(z.string().trim().min(1)),
  dictionaryId: z.number(),
});
export type AddWordBatchRequest = z.infer<typeof AddWordBatchSchema>;

export interface AddWordBatchResponse {
  message: string;
  addedCount: number;
  duplicateCount: number;
}

