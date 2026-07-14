import 'server-only';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/server/db';

/** Hash an IP with the server secret so raw IPs are never stored. */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const secret = process.env.AUTH_SECRET ?? '';
  return createHash('sha256').update(`${ip}|${secret}`).digest('hex').slice(0, 32);
}

export interface AuditInput {
  userId?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipHash?: string | null;
}

/** Append an audit record. Never throws — auditing must not break a request. */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
        ipHash: input.ipHash ?? null,
        ...(input.metadata
          ? { metadata: input.metadata as Prisma.InputJsonValue }
          : {}),
      },
    });
  } catch {
    // swallow
  }
}
