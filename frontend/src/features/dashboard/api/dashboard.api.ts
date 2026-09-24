import apiClient from '../../../shared/api/client';
import type { DashboardStats } from '../../../store/useStore';

export async function fetchDashboardStats(dictionaryId: number): Promise<DashboardStats> {
  const res = await apiClient.get('/dashboard/stats', {
    params: { dictionaryId },
  });
  return res.data.stats;
}
