import { NextResponse } from 'next/server';
import { z } from 'zod';
import { setUserActive, setUserRole } from '@/server/auth/service';
import { getCurrentUser } from '@/server/auth/web';
import { jsonError, readJson, requireCsrf } from '@/server/http';

export const runtime = 'nodejs';

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(['OWNER', 'MEMBER']).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const csrf = await requireCsrf(request);
  if (csrf) return csrf;
  const user = await getCurrentUser();
  if (!user) return jsonError('unauthorized', 401);
  if (user.role !== 'OWNER') return jsonError('forbidden', 403);

  const { id } = await context.params;
  const parsed = patchSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError('invalid_input', 400);

  // An owner cannot disable or demote their own account (avoid lockout).
  if (id === user.id && (parsed.data.isActive === false || parsed.data.role === 'MEMBER')) {
    return jsonError('cannot_modify_self', 400);
  }

  if (parsed.data.isActive !== undefined) await setUserActive(id, parsed.data.isActive);
  if (parsed.data.role !== undefined) await setUserRole(id, parsed.data.role);
  return NextResponse.json({ ok: true });
}
