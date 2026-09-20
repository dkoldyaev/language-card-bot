import type { Request } from 'express';

export interface AuthUser {
  id: number;
  name?: string;
  email: string;
  username: string;
}

export function getAuthUser(req: Request): AuthUser {
  const user = (req as unknown as { user: AuthUser }).user;

  if (!user) {
    throw new Error('User not authenticated');
  }
  
  return { ...user, username: user.username || user.name || user.email } as AuthUser;
}
