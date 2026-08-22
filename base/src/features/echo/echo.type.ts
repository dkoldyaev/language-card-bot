import { z } from 'zod';

export const EchoRequestSchema = z.object({
  message: z.string().optional(),
}).passthrough(); // allows other fields

export type EchoRequest = z.infer<typeof EchoRequestSchema>;

export interface EchoResponse {
  message: string;
  data: unknown;
}
