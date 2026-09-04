import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../../prisma';
import { validateRequest } from '../../middleware/validate';
import { authMiddleware } from '../../middleware/auth';
import { getAuthUser } from './auth.service';
import { GoogleAuthRequestSchema, GoogleAuthRequest, AuthResponse } from './auth.type';
import { env } from '../../core/env';

const router = Router();
const JWT_SECRET = env.JWT_SECRET;
const MERCURE_JWT_SECRET = env.MERCURE_JWT_KEY || env.MERCURE_JWT;

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

function createMercureToken(userId: number) {
  // Use the BASE_DOMAIN from env, fallback to http://localhost
  const baseDomain = env.BASE_DOMAIN || 'http://localhost';
  const topic = `${baseDomain}/v1/users/${userId}`;
  
  return jwt.sign(
    { mercure: { subscribe: [topic] } },
    MERCURE_JWT_SECRET,
    { algorithm: 'HS256' } // Mercure supports HS256
  );
}

router.post('/google', validateRequest(GoogleAuthRequestSchema), async (req: Request<{}, {}, GoogleAuthRequest>, res: Response<AuthResponse | { error: string }>) => {
  const { credential } = req.body;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Invalid Google token payload' });
    }

    const { email, name, picture, sub: providerAccountId } = payload;

    let user = null;
    let isNewUser = false;

    // Check if account already exists
    const existingAccount = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'google',
          providerAccountId,
        },
      },
      include: { user: true },
    });

    if (existingAccount) {
      user = existingAccount.user;
    } else {
      // Find user by email or create new
      user = await prisma.user.findUnique({ where: { email } });
      
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name,
            picture,
            state: {
              create: {}
            },
            accounts: {
              create: {
                provider: 'google',
                providerAccountId,
              }
            }
          }
        });
        isNewUser = true;
      } else {
        // Link new account to existing user
        await prisma.account.create({
          data: {
            userId: user.id,
            provider: 'google',
            providerAccountId,
          }
        });
      }
    }

    const mercureToken = createMercureToken(user.id);
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      token,
      mercureToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        isNewUser,
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  const user = await prisma.user.findUnique({ where: { id: authUser.id } });
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user: { id: user.id, email: user.email, name: user.name, picture: user.picture } });
});

export default router;
