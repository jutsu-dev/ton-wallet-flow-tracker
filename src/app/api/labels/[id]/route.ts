import { NextResponse } from 'next/server';
import { deleteLabel } from '@/server/labels/service';
import { getCurrentUser } from '@/server/auth/web';
import { jsonError, requireCsrf } from '@/server/http';

export const runtime = 'nodejs';

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const csrf = await requireCsrf(request);
  if (csrf) return csrf;
  const user = await getCurrentUser();
  if (!user) return jsonError('unauthorized', 401);

  const { id } = await context.params;
  const outcome = await deleteLabel(id, { id: user.id, role: user.role });
  if (outcome === 'not_found') return jsonError('not_found', 404);
  if (outcome === 'forbidden') return jsonError('forbidden', 403);
  return NextResponse.json({ ok: true });
}
