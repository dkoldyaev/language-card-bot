import type { AuthUser } from '../features/auth/auth.service';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
