import { NextResponse } from 'next/server';
import { createUserSchema } from '@/lib/validation';
import { createUser, listUsers } from '@/server/auth/service';
import { getCurrentUser } from '@/server/auth/web';
import { jsonError, readJson, requireCsrf } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError('unauthorized', 401);
  if (user.role !== 'OWNER') return jsonError('forbidden', 403);
  return NextResponse.json({ users: await listUsers() });
}

export async function POST(request: Request) {
  const csrf = await requireCsrf(request);
  if (csrf) return csrf;
  const user = await getCurrentUser();
  if (!user) return jsonError('unauthorized', 401);
  if (user.role !== 'OWNER') return jsonError('forbidden', 403);

  const parsed = createUserSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError('invalid_input', 400);

  try {
    const created = await createUser({ ...parsed.data, mustChangePassword: true });
    return NextResponse.json({ user: created }, { status: 201 });
  } catch {
    return jsonError('username_taken', 409);
  }
}
