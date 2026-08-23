import { prisma } from '../../prisma';
import { UserState, UserMode } from '@prisma/client';

export async function getUserState(userId: number): Promise<UserState | null> {
  return prisma.userState.findUnique({
    where: { userId }
  });
}

export async function requireUserState(userId: number): Promise<UserState> {
  const state = await getUserState(userId);
  if (!state) {
    throw new Error('User state not found');
  }
  return state;
}

export async function updateUserMode(userId: number, mode: UserMode): Promise<UserState> {
  return prisma.userState.update({
    where: { userId },
    data: { mode }
  });
}
