import { z } from 'zod';

export const GoogleAuthRequestSchema = z.object({
  credential: z.string(),
});

export type GoogleAuthRequest = z.infer<typeof GoogleAuthRequestSchema>;

export const UsernameAuthRequestSchema = z.object({
  username: z.string().min(1),
});

export type UsernameAuthRequest = z.infer<typeof UsernameAuthRequestSchema>;

export const MigrateGuestDefinitionSchema = z.object({
  text: z.string().min(1),
  translation: z.string().nullable().optional(),
});

export const MigrateGuestWordSchema = z.object({
  text: z.string().min(1),
  targetLanguage: z.string().min(1),
  baseLanguage: z.string().min(1),
  definitions: z.array(MigrateGuestDefinitionSchema),
});

export const MigrateGuestAttemptSchema = z.object({
  wordText: z.string().min(1),
  result: z.enum(['SUCCESS', 'CLOSE_MATCH', 'INCORRECT']),
  createdAt: z.string().optional(),
});

export const MigrateGuestDictionarySchema = z.object({
  name: z.string().min(1),
  targetLanguage: z.string().min(1),
  baseLanguage: z.string().min(1),
});

export const MigrateGuestRequestSchema = z.object({
  dictionaries: z.array(MigrateGuestDictionarySchema),
  words: z.array(MigrateGuestWordSchema),
  quizAttempts: z.array(MigrateGuestAttemptSchema),
});

export type MigrateGuestRequest = z.infer<typeof MigrateGuestRequestSchema>;

export interface AuthResponse {
  token: string;
  mercureToken?: string;
  user: {
    id: number;
    email: string;
    username?: string;
    name?: string | null;
    picture?: string | null;
    isNewUser?: boolean;
    isAnonymous: boolean;
    isAdmin?: boolean;
    is_admin?: boolean;
  };
}
