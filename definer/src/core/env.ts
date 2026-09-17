import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string(),
  LLM_SERVICE_URL: z.string(),
  MOCK_TIMEOUT: z.string().optional(),
  CACHE_URL: z.string(),
  TRANSLATOR_API_URL: z.string(),
  TRANSLATOR_APP_TYPE: z.enum(['googletranslate', 'mock', 'laratranslate', 'llm', 'mistral', 'gemini']),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables in Definer service:');
  parsedEnv.error.issues.forEach(issue => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsedEnv.data;
