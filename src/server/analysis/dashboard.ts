import 'server-only';
import { prisma } from '@/server/db';
import { shortenAddress } from '@/lib/utils';

export interface RecentCheckDto {
  id: string;
  address: string;
  short: string;
  limit: number;
  depth: number;
  status: string;
  source: string | null;
  createdAt: string;
}

export interface SavedWalletDto {
  address: string;
  short: string;
  labels: { labelType: string; title: string }[];
}

export async function getDashboardData(
  userId: string,
): Promise<{ recentChecks: RecentCheckDto[]; savedWallets: SavedWalletDto[] }> {
  const [checks, wallets] = await Promise.all([
    prisma.walletCheck.findMany({
      where: { requestedByUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { wallet: true },
    }),
    prisma.wallet.findMany({
      where: { labels: { some: {} } },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: { labels: { take: 3, orderBy: { createdAt: 'desc' } } },
    }),
  ]);

  return {
    recentChecks: checks.map((check) => ({
      id: check.id,
      address: check.wallet.bounceableAddress,
      short: shortenAddress(check.wallet.bounceableAddress, 6, 4),
      limit: check.requestedLimit,
      depth: check.requestedDepth,
      status: check.status,
      source: check.dataSource,
      createdAt: check.createdAt.toISOString(),
    })),
    savedWallets: wallets.map((wallet) => ({
      address: wallet.bounceableAddress,
      short: shortenAddress(wallet.bounceableAddress, 6, 4),
      labels: wallet.labels.map((label) => ({ labelType: label.labelType, title: label.title })),
    })),
  };
}

export async function getWalletHistory(rawAddress: string): Promise<RecentCheckDto[]> {
  const wallet = await prisma.wallet.findUnique({
    where: { canonicalAddress: rawAddress },
    include: { checks: { orderBy: { createdAt: 'desc' }, take: 20 } },
  });
  if (!wallet) return [];
  return wallet.checks.map((check) => ({
    id: check.id,
    address: wallet.bounceableAddress,
    short: shortenAddress(wallet.bounceableAddress, 6, 4),
    limit: check.requestedLimit,
    depth: check.requestedDepth,
    status: check.status,
    source: check.dataSource,
    createdAt: check.createdAt.toISOString(),
  }));
}
