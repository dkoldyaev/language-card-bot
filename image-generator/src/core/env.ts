import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string(),
  IMAGE_GENERATOR_PROVIDER: z.enum([
    'mock',
    'unsplash',
    'pexels',
    'pixabay',
    'wikimedia',
  ]),
  CACHE_URL: z.string(),
  MOCK_TIMEOUT: z.string().optional(),
  UNSPLASH_ACCESS_KEY: z.string().optional(),
  PEXELS_API_KEY: z.string().optional(),
  PIXABAY_API_KEY: z.string().optional(),
  WIKIMEDIA_USER_AGENT: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables in Image Generator service:');
  for (const issue of parsedEnv.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsedEnv.data;
