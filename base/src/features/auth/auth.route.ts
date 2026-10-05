import { type Request, type Response, Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { env } from '../../core/env';
import { authMiddleware } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validate';
import { prisma } from '../../prisma';
import { getAuthUser } from './auth.service';
import {
  type AuthResponse, 
  type GoogleAuthRequest,
  GoogleAuthRequestSchema,
  type MigrateGuestRequest,
  MigrateGuestRequestSchema,
  type UsernameAuthRequest,
  UsernameAuthRequestSchema
} from './auth.type';
import { migrateGuestData } from './migrate_guest.service';

const router = Router();
const JWT_SECRET = env.JWT_SECRET;
const MERCURE_JWT_SECRET = env.MERCURE_JWT_KEY;

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

function createMercureToken(identifier: string | number) {
  const topic = `${env.BASE_DOMAIN}/v1/users/${identifier}`;
  
  return jwt.sign(
    { mercure: { subscribe: [topic] } },
    MERCURE_JWT_SECRET,
    { algorithm: 'HS256' } // Mercure supports HS256
  );
}

// ==========================================
// TEST USERNAME AUTH (for tests & dev)
// ==========================================

router.post('/register', validateRequest(UsernameAuthRequestSchema), async (req: Request<unknown, unknown, UsernameAuthRequest>, res: Response<AuthResponse | { error: string }>) => {
  if (env.ENABLE_TEST_AUTH !== 'true') {
    return res.status(403).json({ error: 'Test authentication is disabled' });
  }

  const { username } = req.body;

  try {
    const email = username.includes('@') ? username : `${username}@test.local`;

    const existingAccount = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'test-username',
          providerAccountId: username,
        },
      },
    });

    const existingUser = existingAccount ? true : await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { email: username }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const registerBody = req.body as UsernameAuthRequest & { isAdmin?: boolean; is_admin?: boolean };
    const isAdmin = Boolean(registerBody.isAdmin || registerBody.is_admin || username.startsWith('admin_'));

    const user = await prisma.user.create({
      data: {
        email,
        name: username,
        isAdmin,
        state: {
          create: {}
        },
        accounts: {
          create: {
            provider: 'test-username',
            providerAccountId: username,
          }
        }
      }
    });

    const mercureToken = createMercureToken(username);
    const token = jwt.sign({ id: user.id, email: user.email, username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      mercureToken,
      user: {
        id: user.id,
        username,
        email: user.email,
        name: user.name,
        picture: user.picture,
        isNewUser: true,
        isAdmin: user.isAdmin,
        is_admin: user.isAdmin,
      }
    });
  } catch (error) {
    console.error('Test register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', validateRequest(UsernameAuthRequestSchema), async (req: Request<unknown, unknown, UsernameAuthRequest>, res: Response<AuthResponse | { error: string }>) => {
  if (env.ENABLE_TEST_AUTH !== 'true') {
    return res.status(403).json({ error: 'Test authentication is disabled' });
  }

  const { username } = req.body;

  try {
    const existingAccount = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'test-username',
          providerAccountId: username,
        },
      },
      include: { user: true },
    });

    let user = existingAccount?.user;

    if (!user) {
      const email = username.includes('@') ? username : `${username}@test.local`;
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { email: username }
          ]
        }
      }) || undefined;
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const mercureToken = createMercureToken(username);
    const token = jwt.sign({ id: user.id, email: user.email, username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      mercureToken,
      user: {
        id: user.id,
        username,
        email: user.email,
        name: user.name,
        picture: user.picture,
        isAdmin: user.isAdmin,
        is_admin: user.isAdmin,
      }
    });
  } catch (error) {
    console.error('Test login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// GOOGLE OAUTH
// ==========================================

router.post('/google', validateRequest(GoogleAuthRequestSchema), async (req: Request<unknown, unknown, GoogleAuthRequest>, res: Response<AuthResponse | { error: string }>) => {
  if (!env.GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: 'Google OAuth is not configured on the server' });
  }

  const { credential } = req.body;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload?.email) {
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

    const username = user.name || user.email;
    const mercureToken = createMercureToken(username);
    const token = jwt.sign({ id: user.id, email: user.email, username }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      token,
      mercureToken,
      user: {
        id: user.id,
        email: user.email,
        username,
        name: user.name,
        picture: user.picture,
        isNewUser,
        isAdmin: user.isAdmin,
        is_admin: user.isAdmin,
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

// ==========================================
// CURRENT USER PROFILE
// ==========================================

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  const user = await prisma.user.findUnique({ where: { id: authUser.id } });
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      username: authUser.username || user.name || user.email,
      name: user.name,
      picture: user.picture,
      isAdmin: user.isAdmin,
      is_admin: user.isAdmin,
    }
  });
});

// ==========================================
// MIGRATE GUEST DATA
// ==========================================

router.post('/migrate-guest', authMiddleware, validateRequest(MigrateGuestRequestSchema), async (req: Request<Record<string, never>, unknown, MigrateGuestRequest>, res: Response) => {
  const { id: userId } = getAuthUser(req);
  try {
    const result = await migrateGuestData(userId, req.body);
    res.json({
      message: 'Guest data migrated successfully',
      ...result,
    });
  } catch (error: unknown) {
    console.error('Migrate guest data error:', error);
    const message = error instanceof Error ? error.message : 'Failed to migrate guest data';
    res.status(500).json({ error: message });
  }
});

export default router;
