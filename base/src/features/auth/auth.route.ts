import { randomUUID } from 'node:crypto';
import { type Request, type Response, Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { env } from '../../core/env';
import { authMiddleware, optionalAuthMiddleware } from '../../middleware/auth';
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

async function getAnonymousUser(req: Pick<Request, 'user'>) {
  if (!req.user) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { accounts: true },
  });

  if (!user || !user.accounts.some((account) => account.provider === 'anonymous')) {
    return null;
  }

  return user;
}

router.post('/anonymous', async (_req: Request, res: Response<AuthResponse | { error: string }>) => {
  try {
    const anonymousId = randomUUID();
    const email = `anonymous-${anonymousId}@anonymous.local`;
    const user = await prisma.user.create({
      data: {
        email,
        name: 'Anonymous learner',
        state: { create: {} },
        accounts: {
          create: {
            provider: 'anonymous',
            providerAccountId: anonymousId,
          },
        },
      },
    });
    const username = `anonymous-${user.id}`;
    const token = jwt.sign({ id: user.id, email: user.email, username }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      mercureToken: createMercureToken(username),
      user: {
        id: user.id,
        email: user.email,
        username,
        name: user.name,
        picture: user.picture,
        isAnonymous: true,
        isAdmin: false,
        is_admin: false,
      },
    });
  } catch (error) {
    console.error('Anonymous session creation error:', error);
    res.status(500).json({ error: 'Failed to create anonymous session' });
  }
});

// ==========================================
// TEST USERNAME AUTH (for tests & dev)
// ==========================================

router.post('/register', optionalAuthMiddleware, validateRequest(UsernameAuthRequestSchema), async (req: Request<unknown, unknown, UsernameAuthRequest>, res: Response<AuthResponse | { error: string }>) => {
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

    const anonymousUser = await getAnonymousUser(req);
    const user = anonymousUser
      ? await prisma.user.update({
        where: { id: anonymousUser.id },
        data: {
          email,
          name: username,
          isAdmin,
          accounts: {
            deleteMany: { provider: 'anonymous' },
            create: {
              provider: 'test-username',
              providerAccountId: username,
            },
          },
        },
      })
      : await prisma.user.create({
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
        isNewUser: !anonymousUser,
        isAnonymous: false,
        isAdmin: user.isAdmin,
        is_admin: user.isAdmin,
      }
    });
  } catch (error) {
    console.error('Test register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', optionalAuthMiddleware, validateRequest(UsernameAuthRequestSchema), async (req: Request<unknown, unknown, UsernameAuthRequest>, res: Response<AuthResponse | { error: string }>) => {
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

    if (await getAnonymousUser(req)) {
      return res.status(409).json({ error: 'An anonymous session can only be linked to a new test account' });
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
        isAnonymous: false,
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

router.post('/google', optionalAuthMiddleware, validateRequest(GoogleAuthRequestSchema), async (req: Request<unknown, unknown, GoogleAuthRequest>, res: Response<AuthResponse | { error: string }>) => {
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

    const anonymousUser = await getAnonymousUser(req);
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
      if (anonymousUser && existingAccount.userId !== anonymousUser.id) {
        return res.status(409).json({ error: 'This Google account is already linked to another user' });
      }
      user = existingAccount.user;
    } else if (anonymousUser) {
      const userWithEmail = await prisma.user.findUnique({ where: { email } });
      if (userWithEmail && userWithEmail.id !== anonymousUser.id) {
        return res.status(409).json({ error: 'This email is already linked to another user' });
      }
      user = await prisma.user.update({
        where: { id: anonymousUser.id },
        data: {
          email,
          name,
          picture,
          accounts: {
            deleteMany: { provider: 'anonymous' },
            create: {
              provider: 'google',
              providerAccountId,
            },
          },
        },
      });
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
        isAnonymous: false,
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
  const user = await prisma.user.findUnique({ where: { id: authUser.id }, include: { accounts: true } });
  
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
      isAnonymous: user.accounts.some((account) => account.provider === 'anonymous'),
      isAdmin: user.isAdmin,
      is_admin: user.isAdmin,
    }
  });
});

// This endpoint exists only to bring data created by the retired browser-only
// mode into an authenticated (including anonymous) server account.
router.post('/migrate-guest', authMiddleware, validateRequest(MigrateGuestRequestSchema), async (req: Request<Record<string, never>, unknown, MigrateGuestRequest>, res: Response) => {
  const { id: userId } = getAuthUser(req);
  try {
    const result = await migrateGuestData(userId, req.body);
    res.json(result);
  } catch (error: unknown) {
    console.error('Legacy data migration error:', error);
    const message = error instanceof Error ? error.message : 'Failed to migrate legacy data';
    res.status(500).json({ error: message });
  }
});

export default router;
