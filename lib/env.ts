import 'server-only';
import { z } from 'zod';

const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required').optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional().default('https://managrameena.com'),
  MANUAL_UPI_ID: z.string().optional(),
  NEXT_PUBLIC_UPI_ID: z.string().optional(),
  UPI_NAME: z.string().default('Mana Grameena'),
  EMAIL_PROVIDER_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional().default('orders@managrameena.com'),
}).refine(
  (data) => data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    message: 'Either NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY must be provided',
    path: ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'],
  }
).refine(
  (data) => data.SUPABASE_SECRET_KEY || data.SUPABASE_SERVICE_ROLE_KEY,
  {
    message: 'Either SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY must be provided',
    path: ['SUPABASE_SECRET_KEY'],
  }
);

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

let validatedEnv: ServerEnv | null = null;

/**
 * Validates and retrieves server-side environment variables.
 * Fails fast with descriptive errors if required configuration is missing.
 */
export function getServerEnv(): ServerEnv {
  if (validatedEnv) {
    return validatedEnv;
  }

  const result = ServerEnvSchema.safeParse(process.env);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `  - [${issue.path.join('.')}]: ${issue.message}`)
      .join('\n');
    console.error('FATAL: Environment configuration validation failed:\n' + errorDetails);
    throw new Error('Invalid server environment configuration:\n' + errorDetails);
  }

  validatedEnv = result.data;
  return validatedEnv;
}

export const validateServerEnv = getServerEnv;

/**
 * Server-controlled helper to safely expose public UPI configuration to components.
 * Guarantees a single source of truth without client-side credential assumptions.
 */
export function getPublicUpiConfig(): {
  upiId: string | null;
  upiName: string;
  merchantName: string;
  isConfigured: boolean;
} {
  const env = getServerEnv();
  const upiId = env.MANUAL_UPI_ID || env.NEXT_PUBLIC_UPI_ID || null;
  return {
    upiId,
    upiName: env.UPI_NAME,
    merchantName: env.UPI_NAME,
    isConfigured: Boolean(upiId),
  };
}
