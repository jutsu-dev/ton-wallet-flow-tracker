import 'server-only';
import type { Role, User } from '@prisma/client';
import { prisma } from '@/server/db';
import { getEnv } from '@/lib/env';
import { hashPassword, verifyPassword } from './password';
import { destroyAllSessions } from './session';
import { rateLimit } from '@/server/rate-limit';
import { hashIp, recordAudit } from '@/server/audit';

// Core authentication logic. Deliberately free of next/headers so it can be
// tested against a database without a Next request context.

export interface PublicUser {
  id: string;
  username: string;
  role: Role;
  mustChangePassword: boolean;
  isActive: boolean;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    isActive: user.isActive,
  };
}

export type AuthStatus = 'ok' | 'invalid' | 'locked' | 'disabled' | 'rate_limited';

export interface AuthResult {
  status: AuthStatus;
  user?: PublicUser;
}

export interface LoginContext {
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Verify credentials with lockout and IP rate limiting. Does not create a
 * session — the web layer does that on `ok`.
 */
export async function authenticateUser(
  username: string,
  password: string,
  ctx: LoginContext = {},
): Promise<AuthResult> {
  const env = getEnv();
  const ipHash = hashIp(ctx.ip);
  const rl = rateLimit(
    `login:${ctx.ip ?? 'unknown'}`,
    env.LOGIN_MAX_ATTEMPTS * 3,
    env.LOGIN_LOCKOUT_MINUTES * 60_000,
  );
  if (!rl.allowed) {
    await recordAudit({ action: 'login_rate_limited', ipHash });
    return { status: 'rate_limited' };
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    // Spend comparable time to blunt user-enumeration by timing.
    await hashPassword(password).catch(() => undefined);
    await recordAudit({ action: 'login_failed', metadata: { username, reason: 'no_user' }, ipHash });
    return { status: 'invalid' };
  }
  if (!user.isActive) {
    await recordAudit({ userId: user.id, action: 'login_failed', metadata: { reason: 'disabled' }, ipHash });
    return { status: 'disabled' };
  }
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    await recordAudit({ userId: user.id, action: 'login_locked', ipHash });
    return { status: 'locked' };
  }

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) {
    const failed = user.failedLoginCount + 1;
    const shouldLock = failed >= env.LOGIN_MAX_ATTEMPTS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: shouldLock ? 0 : failed,
        lockedUntil: shouldLock
          ? new Date(Date.now() + env.LOGIN_LOCKOUT_MINUTES * 60_000)
          : user.lockedUntil,
      },
    });
    await recordAudit({
      userId: user.id,
      action: shouldLock ? 'account_locked' : 'login_failed',
      metadata: { attempts: failed },
      ipHash,
    });
    return { status: shouldLock ? 'locked' : 'invalid' };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  await recordAudit({ userId: user.id, action: 'login_success', ipHash });
  return { status: 'ok', user: toPublicUser(user) };
}

/** Set a new password, clear the forced-change flag, and revoke all sessions. */
export async function changePassword(userId: string, newPassword: string): Promise<void> {
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: false },
  });
  await destroyAllSessions(userId);
  await recordAudit({ userId, action: 'password_changed' });
}

export interface CreateUserInput {
  username: string;
  password: string;
  role: Role;
  mustChangePassword?: boolean;
}

/** Create a user (owner-only operation at the web layer). */
export async function createUser(input: CreateUserInput): Promise<PublicUser> {
  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      username: input.username,
      passwordHash,
      role: input.role,
      mustChangePassword: input.mustChangePassword ?? true,
    },
  });
  await recordAudit({ userId: user.id, action: 'user_created', resourceType: 'user', resourceId: user.id });
  return toPublicUser(user);
}

export async function setUserActive(userId: string, isActive: boolean): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  if (!isActive) await destroyAllSessions(userId);
  await recordAudit({ action: isActive ? 'user_enabled' : 'user_disabled', resourceType: 'user', resourceId: userId });
}

export async function setUserRole(userId: string, role: Role): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { role } });
  await recordAudit({ action: 'user_role_changed', resourceType: 'user', resourceId: userId, metadata: { role } });
}

/** Verify a password without touching lockout/rate-limit state (for re-auth). */
export async function verifyCurrentPassword(userId: string, password: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return false;
  return verifyPassword(user.passwordHash, password);
}

export async function listUsers(): Promise<PublicUser[]> {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  return users.map(toPublicUser);
}
