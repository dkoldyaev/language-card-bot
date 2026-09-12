import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { getAuthUser } from '../features/auth/auth.service';

export const adminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = getAuthUser(req);
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, isAdmin: true },
    });

    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
