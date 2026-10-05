import { z } from 'zod';

export const DashboardStatsQuerySchema = z.object({
  dictionaryId: z.string().regex(/^\d+$/),
});
export type DashboardStatsQuery = z.infer<typeof DashboardStatsQuerySchema>;
