import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string(),
  TRANSLATOR_APP_TYPE: z.enum(['googletranslate', 'mock', 'laratranslate']),
  GOOGLE_TRANSLATE_API_KEY: z.string().optional(),
  LARA_ACCESS_KEY_ID: z.string().optional(),
  LARA_ACCESS_KEY_SECRET: z.string().optional(),
  MOCK_TIMEOUT: z.string().optional(),
  CACHE_URL: z.string(),
}).superRefine((data, ctx) => {
  if (data.TRANSLATOR_APP_TYPE === 'googletranslate') {
    if (!data.GOOGLE_TRANSLATE_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'GOOGLE_TRANSLATE_API_KEY is required when TRANSLATOR_APP_TYPE is googletranslate',
        path: ['GOOGLE_TRANSLATE_API_KEY'],
      });
    }
  }

  if (data.TRANSLATOR_APP_TYPE === 'laratranslate') {
    if (!data.LARA_ACCESS_KEY_ID) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'LARA_ACCESS_KEY_ID is required when TRANSLATOR_APP_TYPE is laratranslate',
        path: ['LARA_ACCESS_KEY_ID'],
      });
    }
    if (!data.LARA_ACCESS_KEY_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'LARA_ACCESS_KEY_SECRET is required when TRANSLATOR_APP_TYPE is laratranslate',
        path: ['LARA_ACCESS_KEY_SECRET'],
      });
    }
  }
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
