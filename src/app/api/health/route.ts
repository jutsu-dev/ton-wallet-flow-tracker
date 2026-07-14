import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Basic liveness. A database-connectivity check is added once Prisma is wired in.
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'ton-wallet-flow-tracker',
      time: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
