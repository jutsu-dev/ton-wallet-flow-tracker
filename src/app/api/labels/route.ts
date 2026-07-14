import { NextResponse } from 'next/server';
import { labelSchema } from '@/lib/validation';
import { createLabel, listLabelsForAddress } from '@/server/labels/service';
import { getCurrentUser } from '@/server/auth/web';
import { jsonError, readJson, requireCsrf } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError('unauthorized', 401);
  const address = new URL(request.url).searchParams.get('address');
  if (!address) return jsonError('invalid_input', 400);
  return NextResponse.json({ labels: await listLabelsForAddress(address) });
}

export async function POST(request: Request) {
  const csrf = await requireCsrf(request);
  if (csrf) return csrf;
  const user = await getCurrentUser();
  if (!user) return jsonError('unauthorized', 401);

  const parsed = labelSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError('invalid_input', 400);

  try {
    const label = await createLabel(parsed.data, user.id);
    return NextResponse.json({ label }, { status: 201 });
  } catch {
    return jsonError('invalid_address', 400);
  }
}
