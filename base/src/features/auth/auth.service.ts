import { Request } from 'express';

export interface AuthUser {
  id: number;
  username: string;
}

export function getAuthUser(req: Request): AuthUser {
  // @ts-ignore
  const user = req.user;
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  return user as AuthUser;
}
