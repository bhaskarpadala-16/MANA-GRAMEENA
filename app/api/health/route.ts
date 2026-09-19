import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Lightweight Liveness Probe.
 * Zero database overhead; returns 200 OK if server process is running.
 * Discloses zero infrastructure details or environment flags.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
