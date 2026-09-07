import { z } from 'zod';

export const GoogleAuthRequestSchema = z.object({
  credential: z.string(),
});

export type GoogleAuthRequest = z.infer<typeof GoogleAuthRequestSchema>;

export const UsernameAuthRequestSchema = z.object({
  username: z.string().min(1),
});

export type UsernameAuthRequest = z.infer<typeof UsernameAuthRequestSchema>;

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
  };
}

