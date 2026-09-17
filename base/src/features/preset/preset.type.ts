import { z } from 'zod';

export const AVAILABLE_LANGUAGES = [
  'en',
  'es',
  'fr',
  'de',
  'ru',
  'it',
  'pt',
  'zh',
  'ja',
  'tr'
] as const;

export type AvailableLanguage = typeof AVAILABLE_LANGUAGES[number];

export const WordDefinitionPresetBodySchema = z.array(
  z.object({
    word: z.string().trim().min(1),
    definitions: z.array(
      z.union([
        z.string().trim().min(1),
        z.object({
          text: z.string().trim().min(1),
          translation: z.string().trim().optional(),
          translations: z.record(z.string(), z.string()).optional(),
        })
      ])
    ).min(1),
  })
);

export type WordDefinitionPresetBody = z.infer<typeof WordDefinitionPresetBodySchema>;

export const CreatePresetSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional().nullable(),
  for_language: z.enum(AVAILABLE_LANGUAGES).optional(),
  forLanguage: z.enum(AVAILABLE_LANGUAGES).optional(),
  type: z.string().trim().min(1),
  body: z.unknown(),
}).refine(data => data.for_language || data.forLanguage, {
  message: 'for_language or forLanguage is required',
  path: ['for_language']
});

export type CreatePresetInput = z.infer<typeof CreatePresetSchema>;

export const UpdatePresetSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  for_language: z.enum(AVAILABLE_LANGUAGES).optional(),
  forLanguage: z.enum(AVAILABLE_LANGUAGES).optional(),
  type: z.string().trim().min(1).optional(),
  body: z.unknown().optional(),
});

export type UpdatePresetInput = z.infer<typeof UpdatePresetSchema>;

export const ApplyPresetSchema = z.object({
  dictionaryId: z.number().int().positive(),
  presetId: z.number().int().positive(),
});

export type ApplyPresetInput = z.infer<typeof ApplyPresetSchema>;

export interface PresetDto {
  id: number;
  title: string;
  description: string | null;
  for_language: string;
  forLanguage: string;
  type: string;
  body: unknown;
  createdAt: string;
  updatedAt: string;
}
