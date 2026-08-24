import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';
import { validateRequest } from '../../middleware/validate';
import { authMiddleware } from '../../middleware/auth';
import { getAuthUser } from './auth.service';
import { AuthRequestSchema, AuthRequest, AuthResponse } from './auth.type';
import { UserMode } from '@prisma/client';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

router.post('/register', validateRequest(AuthRequestSchema), async (req: Request<{}, {}, AuthRequest>, res: Response<AuthResponse | { error: string }>) => {
  const { username } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const user = await prisma.user.create({
      data: {
        username,
        state: {
          create: {
            mode: UserMode.DEFAULT
          }
        }
      }
    });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', validateRequest(AuthRequestSchema), async (req: Request<{}, {}, AuthRequest>, res: Response<AuthResponse | { error: string }>) => {
  const { username } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  const { id: userId, username } = getAuthUser(req);
  res.json({ user: { id: userId, username } });
});

export default router;
