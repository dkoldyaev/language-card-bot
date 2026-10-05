import { type Request, type Response, Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validate';
import { getAuthUser } from '../auth/auth.service';
import { getDashboardStats } from './dashboard.service';
import { type DashboardStatsQuery, DashboardStatsQuerySchema } from './dashboard.type';

const router = Router();

router.get('/stats', authMiddleware, validateRequest(DashboardStatsQuerySchema, 'query'), async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const { dictionaryId } = req.query as unknown as DashboardStatsQuery;

  try {
    // TODO(query-normalization): query values remain raw after validation; convert numeric values at their use sites.
    const parsedDictionaryId = parseInt(dictionaryId, 10);
    const stats = await getDashboardStats(user.id, parsedDictionaryId);
    res.json({ stats });
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
