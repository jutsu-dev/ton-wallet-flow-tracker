import { NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validation';
import { authenticateUser } from '@/server/auth/service';
import { establishSession, getRequestContext } from '@/server/auth/web';
import { verifyOrigin } from '@/server/auth/csrf';
import { getEnv } from '@/lib/env';
import { jsonError, readJson } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // No CSRF token exists before login; enforce same-origin instead.
  if (!verifyOrigin(request.headers.get('origin'), getEnv().APP_URL)) {
    return jsonError('csrf', 403);
  }
  const parsed = loginSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError('invalid_input', 400);

  const ctx = await getRequestContext();
  const result = await authenticateUser(parsed.data.username, parsed.data.password, ctx);
  if (result.status !== 'ok' || !result.user) {
    const status =
      result.status === 'rate_limited'
        ? 429
        : result.status === 'locked'
          ? 423
          : result.status === 'disabled'
            ? 403
            : 401;
    return jsonError(result.status, status);
  }

  await establishSession(result.user.id, ctx);
  return NextResponse.json({
    ok: true,
    mustChangePassword: result.user.mustChangePassword,
    role: result.user.role,
  });
}
