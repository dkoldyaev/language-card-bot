import type { NextFunction, Request, Response } from 'express';
import { getAuthUser } from '../features/auth/auth.service';
import { prisma } from '../prisma';

export const adminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = getAuthUser(req);
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, isAdmin: true },
    });

    if (!user?.isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    next();
  } catch (_error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
