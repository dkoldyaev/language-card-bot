import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  PORT: z.string(),
  MERCURE_URL: z.string(),
  MERCURE_JWT: z.string(),
  MERCURE_JWT_KEY: z.string().optional(),
  TRANSLATOR_API_URL: z.string(),
  DEFINER_API_URL: z.string(),
  DEFINER_APP_TYPE: z.enum(['mistral', 'gemini', 'mock', 'freedictionary']),
  TRANSLATOR_APP_TYPE: z.enum(['googletranslate', 'mock', 'laratranslate', 'llm', 'mistral', 'gemini']),
  BASE_DOMAIN: z.string(),
  REDIS_URL: z.string(),
  CORS_ORIGIN: z.string(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  ENABLE_TEST_AUTH: z.string().optional(),
  LLM_API_URL: z.string().min(1),
  LLM_PROVIDER: z.enum(['mistral', 'gemini', 'mock']),
  LLM_MODEL: z.string().min(1),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables in Base service:');
  parsedEnv.error.issues.forEach(issue => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsedEnv.data;
