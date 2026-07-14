import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Liveness + database connectivity. Returns 503 if the database is unreachable
// so the container healthcheck can restart a broken instance.
export async function GET() {
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  return NextResponse.json(
    {
      status: dbOk ? 'ok' : 'degraded',
      service: 'ton-wallet-flow-tracker',
      database: dbOk ? 'up' : 'down',
      time: new Date().toISOString(),
    },
    { status: dbOk ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
