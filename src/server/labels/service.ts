import 'server-only';
import { prisma } from '@/server/db';
import { normalizeAddress } from '@/lib/ton/address';
import { sanitizeText } from '@/domain/sanitize';
import { recordAudit } from '@/server/audit';
import type { LabelInput } from '@/lib/validation';

export interface LabelDto {
  id: string;
  labelType: string;
  title: string;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
}

export async function createLabel(input: LabelInput, userId: string): Promise<LabelDto> {
  const normalized = normalizeAddress(input.address);
  if (!normalized) throw new Error('invalid_address');
  const wallet = await prisma.wallet.upsert({
    where: { canonicalAddress: normalized.raw },
    create: {
      canonicalAddress: normalized.raw,
      bounceableAddress: normalized.bounceable,
      nonBounceableAddress: normalized.nonBounceable,
    },
    update: {},
  });
  const label = await prisma.walletLabel.create({
    data: {
      walletId: wallet.id,
      createdByUserId: userId,
      labelType: input.labelType,
      title: sanitizeText(input.title, 80) ?? input.title,
      note: sanitizeText(input.note ?? null, 500),
    },
  });
  await recordAudit({
    userId,
    action: 'label_created',
    resourceType: 'wallet_label',
    resourceId: label.id,
    metadata: { labelType: input.labelType },
  });
  return {
    id: label.id,
    labelType: label.labelType,
    title: label.title,
    note: label.note,
    createdBy: null,
    createdAt: label.createdAt.toISOString(),
  };
}

export async function listLabelsForAddress(address: string): Promise<LabelDto[]> {
  const normalized = normalizeAddress(address);
  if (!normalized) return [];
  const wallet = await prisma.wallet.findUnique({
    where: { canonicalAddress: normalized.raw },
    include: {
      labels: {
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { username: true } } },
      },
    },
  });
  return (wallet?.labels ?? []).map((label) => ({
    id: label.id,
    labelType: label.labelType,
    title: label.title,
    note: label.note,
    createdBy: label.createdBy?.username ?? null,
    createdAt: label.createdAt.toISOString(),
  }));
}

export async function deleteLabel(
  id: string,
  user: { id: string; role: string },
): Promise<'ok' | 'not_found' | 'forbidden'> {
  const label = await prisma.walletLabel.findUnique({ where: { id } });
  if (!label) return 'not_found';
  if (user.role !== 'OWNER' && label.createdByUserId !== user.id) return 'forbidden';
  await prisma.walletLabel.delete({ where: { id } });
  await recordAudit({ userId: user.id, action: 'label_deleted', resourceType: 'wallet_label', resourceId: id });
  return 'ok';
}
