import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    app: 'Mana Grameena E-Commerce',
    phase: 'Phase 1: Foundation Complete',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    keyArchitecture: {
      supabasePublicConfigured: !!(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      ),
      supabaseSecretConfigured: !!(
        process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      ),
      databaseConfigured: !!process.env.DATABASE_URL,
    },
  });
}
