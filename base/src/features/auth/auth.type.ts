import { z } from 'zod';

export const AuthRequestSchema = z.object({
  username: z.string().min(3).max(50),
});

export type AuthRequest = z.infer<typeof AuthRequestSchema>;

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    username: string;
  };
}
