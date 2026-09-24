import { type Request, type Response, Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validate';
import { getAuthUser } from '../auth/auth.service';
import { getDashboardStats } from './dashboard.service';
import { DashboardStatsQuerySchema, type DashboardStatsQuery } from './dashboard.type';

const router = Router();

router.get('/stats', authMiddleware, validateRequest(DashboardStatsQuerySchema, 'query'), async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const { dictionaryId } = req.query as unknown as DashboardStatsQuery;

  try {
    const stats = await getDashboardStats(user.id, dictionaryId);
    res.json({ stats });
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
