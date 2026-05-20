import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string(),
  ['ONEINCH' + '_API_KEY']: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  REDIS_URL: z.string().optional(),
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().optional(),
});

export const env = envSchema.parse(process.env);
