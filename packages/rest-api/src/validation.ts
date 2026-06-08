import { z } from 'zod';
import { Language, CefrLevel } from '@ecb/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Базовые схемы
// ─────────────────────────────────────────────────────────────────────────────

export const LanguageSchema = z.nativeEnum(Language, {
  errorMap: () => ({
    message: `Допустимые значения: ${Object.values(Language).join(', ')}`,
  }),
});

export const CefrLevelSchema = z.nativeEnum(CefrLevel, {
  errorMap: () => ({
    message: `Допустимые значения: ${Object.values(CefrLevel).join(', ')}`,
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Тела запросов
// ─────────────────────────────────────────────────────────────────────────────

export const UpdateSettingsSchema = z
  .object({
    baseLanguage: LanguageSchema.optional(),
    learnedLanguage: LanguageSchema.optional(),
    level: CefrLevelSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Необходимо передать хотя бы одно поле',
  });

export const AddWordSchema = z.object({
  text: z
    .string({ required_error: 'Поле text обязательно' })
    .max(200, 'Слово слишком длинное')
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, 'Слово не может быть пустым'),
});

export const AddWordsSchema = z.object({
  words: z
    .array(
      z.string()
        .max(200)
        .transform((s) => s.trim())
        .refine((s) => s.length > 0, 'Слово не может быть пустым')
    )
    .min(1, 'Список слов не может быть пустым')
    .max(50, 'Максимум 50 слов за один запрос'),
});

export const UpdateDefinitionSchema = z
  .object({
    text: z.string().min(1).max(2000).optional(),
    translation: z.string().min(1).max(2000).optional(),
  })
  .strict()
  .refine((data) => data.text !== undefined || data.translation !== undefined, {
    message: 'Необходимо передать text или translation',
  });

// ─────────────────────────────────────────────────────────────────────────────
// Query параметры
// ─────────────────────────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const WordsFilterSchema = PaginationSchema.extend({
  status: z.enum(['pending', 'processing', 'ready', 'error']).optional(),
  search: z.string().max(100).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Типы, выведенные из схем
// ─────────────────────────────────────────────────────────────────────────────

export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;
export type AddWordInput = z.infer<typeof AddWordSchema>;
export type AddWordsInput = z.infer<typeof AddWordsSchema>;
export type UpdateDefinitionInput = z.infer<typeof UpdateDefinitionSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;
export type WordsFilterInput = z.infer<typeof WordsFilterSchema>;
