import type { Request } from 'express';

export interface AuthUser {
  id: number;
  name?: string;
  email: string;
  username: string;
}

export function getAuthUser(req: Request): AuthUser {
  const user = req.user;

  if (!user) {
    throw new Error('User not authenticated');
  }

  return {
    id: user.id,
    email: user.email,
    username: user.username || user.name || user.email,
    name: user.name,
  };
}
