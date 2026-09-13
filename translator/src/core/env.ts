import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string(),
  GOOGLE_TRANSLATE_API_KEY: z.string().optional(),
  LARA_ACCESS_KEY_ID: z.string().optional(),
  LARA_ACCESS_KEY_SECRET: z.string().optional(),
  MOCK_TIMEOUT: z.string().optional(),
  CACHE_URL: z.string(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables in Translator service:');
  parsedEnv.error.issues.forEach(issue => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsedEnv.data;
