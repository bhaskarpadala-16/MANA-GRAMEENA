import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Temporary Diagnostic Endpoint.
 * Reports sanitized connection parameters and underlying database error details
 * without ever exposing username, password, or secret tokens.
 */
export async function GET() {
  const dbUrl = process.env.DATABASE_URL;
  const parsed = {
    exists: Boolean(dbUrl && dbUrl.trim().length > 0),
    hostname: null as string | null,
    port: null as string | null,
    sslmode: null as string | null,
  };

  if (dbUrl) {
    try {
      const url = new URL(dbUrl);
      parsed.hostname = url.hostname;
      parsed.port = url.port || '5432';
      parsed.sslmode = url.searchParams.get('sslmode');
    } catch {
      parsed.hostname = 'malformed-url';
    }
  }

  let dbStatus = 'unknown';
  let errorDetails: {
    name?: string;
    code?: string;
    message?: string;
  } | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (err: any) {
    dbStatus = 'failed';
    const rawMsg = err?.message || String(err);
    const sanitizedMsg = rawMsg.replace(/:\/\/[^@]+@/g, '://***:***@');

    errorDetails = {
      name: err?.name,
      code: err?.code,
      message: sanitizedMsg,
    };

    console.error('[Diagnostic DB Error]:', {
      name: err?.name,
      code: err?.code,
      message: sanitizedMsg,
    });
  }

  return NextResponse.json(
    {
      'DATABASE_URL exists': parsed.exists,
      hostname: parsed.hostname,
      port: parsed.port,
      sslmode: parsed.sslmode,
      database: dbStatus,
      error: errorDetails,
      timestamp: new Date().toISOString(),
    },
    {
      status: dbStatus === 'connected' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
