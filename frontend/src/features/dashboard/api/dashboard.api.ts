import apiClient from '../../../shared/api/client';
import type { DashboardStats } from '../../../store/useStore';

export async function fetchDashboardStats(dictionaryId: number, signal?: AbortSignal): Promise<DashboardStats> {
  const res = await apiClient.get('/dashboard/stats', {
    params: { dictionaryId },
    signal,
  });
  return res.data.stats;
}
