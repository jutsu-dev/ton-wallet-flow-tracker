import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@/server/db';
import type { User } from '@prisma/client';

export const SESSION_COOKIE = 'twft_session';
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface SessionMeta {
  ipHash?: string | null;
  userAgent?: string | null;
}

/** Create a session and return the raw token (stored only as a hash server-side). */
export async function createSession(
  userId: string,
  meta: SessionMeta = {},
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      ipHash: meta.ipHash ?? null,
      userAgent: meta.userAgent?.slice(0, 255) ?? null,
    },
  });
  return { token, expiresAt };
}

/** Resolve a session token to its active user, or null. Expired sessions are pruned. */
export async function findSessionUser(token: string | undefined | null): Promise<User | null> {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (!session.user.isActive) return null;
  return session.user;
}

export async function destroySession(token: string | undefined | null): Promise<void> {
  if (!token) return;
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

/** Invalidate every session for a user (used on password change / account disable). */
export async function destroyAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}
