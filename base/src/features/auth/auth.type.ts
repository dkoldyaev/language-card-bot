import { z } from 'zod';

export const GoogleAuthRequestSchema = z.object({
  credential: z.string(),
});

export type GoogleAuthRequest = z.infer<typeof GoogleAuthRequestSchema>;

export interface AuthResponse {
  token: string;
  mercureToken?: string;
  user: {
    id: number;
    email: string;
    name?: string | null;
    picture?: string | null;
    isNewUser?: boolean;
  };
}
