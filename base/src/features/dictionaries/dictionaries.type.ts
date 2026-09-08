import { z } from 'zod';

export const CreateDictionaryRequestSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  targetLanguage: z.string().trim().min(2).max(10),
  baseLanguage: z.string().trim().min(2).max(10),
});

export type CreateDictionaryRequest = z.infer<typeof CreateDictionaryRequestSchema>;

export const UpdateDictionaryRequestSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  targetLanguage: z.string().trim().min(2).max(10).optional(),
  baseLanguage: z.string().trim().min(2).max(10).optional(),
});

export type UpdateDictionaryRequest = z.infer<typeof UpdateDictionaryRequestSchema>;

export interface DictionaryItemDto {
  id: number;
  name: string;
  targetLanguage: string;
  baseLanguage: string;
  wordCount: number;
  isActive: boolean;
  createdAt: string;
}
