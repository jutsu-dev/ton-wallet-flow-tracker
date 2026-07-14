import { NextResponse } from 'next/server';
import { changePasswordSchema } from '@/lib/validation';
import { changePassword, verifyCurrentPassword } from '@/server/auth/service';
import { establishSession, getCurrentUser, getRequestContext } from '@/server/auth/web';
import { jsonError, readJson, requireCsrf } from '@/server/http';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const csrf = await requireCsrf(request);
  if (csrf) return csrf;
  const user = await getCurrentUser();
  if (!user) return jsonError('unauthorized', 401);

  const parsed = changePasswordSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError('invalid_input', 400);

  if (!(await verifyCurrentPassword(user.id, parsed.data.currentPassword))) {
    return jsonError('invalid_current', 400);
  }

  await changePassword(user.id, parsed.data.newPassword);
  // changePassword revokes all sessions; start a fresh one so the user stays in.
  await establishSession(user.id, await getRequestContext());
  return NextResponse.json({ ok: true });
}
