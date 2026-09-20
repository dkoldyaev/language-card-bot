import { z } from 'zod';
import { type LanguageCode, SUPPORTED_LANGUAGES } from '../../types/language';

export const CreateDictionaryRequestSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  targetLanguage: z.enum(SUPPORTED_LANGUAGES),
  baseLanguage: z.enum(SUPPORTED_LANGUAGES),
});

export type CreateDictionaryRequest = z.infer<typeof CreateDictionaryRequestSchema>;

export const UpdateDictionaryRequestSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  targetLanguage: z.enum(SUPPORTED_LANGUAGES).optional(),
  baseLanguage: z.enum(SUPPORTED_LANGUAGES).optional(),
});

export type UpdateDictionaryRequest = z.infer<typeof UpdateDictionaryRequestSchema>;

export interface DictionaryItemDto {
  id: number;
  name: string;
  targetLanguage: LanguageCode;
  baseLanguage: LanguageCode;
  wordCount: number;
  isActive: boolean;
  createdAt: string;
}
