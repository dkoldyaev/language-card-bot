import { z } from 'zod';

export const DashboardStatsQuerySchema = z.object({
  dictionaryId: z.coerce.number(),
});
export type DashboardStatsQuery = z.infer<typeof DashboardStatsQuerySchema>;
