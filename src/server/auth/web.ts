import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getEnv } from '@/lib/env';
import { createSession, destroySession, findSessionUser, SESSION_COOKIE } from './session';
import { CSRF_COOKIE, CSRF_HEADER, generateCsrfToken, verifyDoubleSubmit, verifyOrigin } from './csrf';
import { hashIp } from '@/server/audit';
import { toPublicUser, type LoginContext, type PublicUser } from './service';

/** Extract client IP and user-agent from proxy headers. */
export async function getRequestContext(): Promise<LoginContext> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  const ip = forwarded ? (forwarded.split(',')[0]?.trim() ?? null) : h.get('x-real-ip');
  return { ip, userAgent: h.get('user-agent') };
}

/** Create a session and set the session + CSRF cookies. Returns the CSRF token. */
export async function establishSession(userId: string, ctx: LoginContext = {}): Promise<string> {
  const env = getEnv();
  const { token, expiresAt } = await createSession(userId, {
    ipHash: hashIp(ctx.ip),
    userAgent: ctx.userAgent,
  });
  const csrf = generateCsrfToken();
  const store = await cookies();
  const secure = env.APP_ENV === 'production';
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
  store.set(CSRF_COOKIE, csrf, {
    httpOnly: false,
    secure,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
  return csrf;
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const user = await findSessionUser(token);
  return user ? toPublicUser(user) : null;
}

export async function logout(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  await destroySession(token);
  store.delete(SESSION_COOKIE);
  store.delete(CSRF_COOKIE);
}

export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireOwner(): Promise<PublicUser> {
  const user = await requireUser();
  if (user.role !== 'OWNER') redirect('/');
  return user;
}

/** Double-submit CSRF token check plus same-origin check, for mutating routes. */
export async function verifyCsrf(request: Request): Promise<boolean> {
  const env = getEnv();
  const store = await cookies();
  const cookieToken = store.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get(CSRF_HEADER);
  const origin = request.headers.get('origin');
  return verifyDoubleSubmit(cookieToken, headerToken) && verifyOrigin(origin, env.APP_URL);
}
