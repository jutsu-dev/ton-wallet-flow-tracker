import { NextResponse } from 'next/server';
import { logout } from '@/server/auth/web';
import { requireCsrf } from '@/server/http';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const csrf = await requireCsrf(request);
  if (csrf) return csrf;
  await logout();
  return NextResponse.json({ ok: true });
}
