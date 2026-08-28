import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';
import { validateRequest } from '../../middleware/validate';
import { authMiddleware } from '../../middleware/auth';
import { getAuthUser } from './auth.service';
import { AuthRequestSchema, AuthRequest, AuthResponse } from './auth.type';

import { env } from '../../core/env';

const router = Router();
const JWT_SECRET = env.JWT_SECRET;
const MERCURE_JWT_SECRET = env.MERCURE_JWT_KEY || env.MERCURE_JWT;

function createMercureToken(username: string) {
  // Use the BASE_DOMAIN from env, fallback to http://localhost
  const baseDomain = env.BASE_DOMAIN || 'http://localhost';
  const topic = `${baseDomain}/v1/users/${username}`;
  
  return jwt.sign(
    { mercure: { subscribe: [topic] } },
    MERCURE_JWT_SECRET,
    { algorithm: 'HS256' } // Mercure supports HS256
  );
}

router.post('/register', validateRequest(AuthRequestSchema), async (req: Request<{}, {}, AuthRequest>, res: Response<AuthResponse & { mercureToken?: string } | { error: string }>) => {
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
          create: {}
        }
      }
    });

    const mercureToken = createMercureToken(user.username);
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, mercureToken, user: { id: user.id, username: user.username } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', validateRequest(AuthRequestSchema), async (req: Request<{}, {}, AuthRequest>, res: Response<AuthResponse & { mercureToken?: string } | { error: string }>) => {
  const { username } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const mercureToken = createMercureToken(user.username);
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, mercureToken, user: { id: user.id, username: user.username } });
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
