import { NextResponse } from 'next/server';
import { getWalletAssets } from '@/server/analysis/assets';
import { getCurrentUser } from '@/server/auth/web';
import { normalizeAddress } from '@/lib/ton/address';
import { jsonError } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError('unauthorized', 401);

  const address = new URL(request.url).searchParams.get('address');
  const normalized = address ? normalizeAddress(address) : null;
  if (!normalized) return jsonError('invalid_address', 400);

  try {
    return NextResponse.json(await getWalletAssets(normalized.raw));
  } catch {
    return jsonError('provider_unavailable', 502);
  }
}
