import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { getAuthUser } from '../auth/auth.service';
import { getDashboardStats } from './dashboard.service';

const router = Router();

router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const dictionaryId = req.query.dictionaryId ? parseInt(req.query.dictionaryId as string, 10) : undefined;

  try {
    const stats = await getDashboardStats(user.id, !isNaN(Number(dictionaryId)) ? Number(dictionaryId) : undefined);
    res.json({ stats });
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
