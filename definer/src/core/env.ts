import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string(),
  DEFINER_APP_TYPE: z.enum(['mistral', 'gemini', 'mock', 'freedictionary']),
  MISTRAL_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  MOCK_TIMEOUT: z.string().optional(),
  CACHE_URL: z.string(),
}).superRefine((data, ctx) => {
  if (data.DEFINER_APP_TYPE === 'mistral') {
    if (!data.MISTRAL_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'MISTRAL_API_KEY is required when DEFINER_APP_TYPE is mistral',
        path: ['MISTRAL_API_KEY'],
      });
    }
  }

  if (data.DEFINER_APP_TYPE === 'gemini') {
    if (!data.GEMINI_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'GEMINI_API_KEY is required when DEFINER_APP_TYPE is gemini',
        path: ['GEMINI_API_KEY'],
      });
    }
  }
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
