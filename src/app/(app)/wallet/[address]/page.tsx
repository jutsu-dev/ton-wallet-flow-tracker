import Link from 'next/link';
import { getCurrentUser } from '@/server/auth/web';
import { analyzeWallet, AnalysisError } from '@/server/analysis/service';
import type { AnalysisResult } from '@/server/analysis/types';
import { analyzeSchema } from '@/lib/validation';
import { getWalletHistory } from '@/server/analysis/dashboard';
import { listLabelsForAddress } from '@/server/labels/service';
import { errorMessage } from '@/lib/i18n';
import { Alert } from '@/components/ui';
import { WalletView } from '@/components/wallet/wallet-view';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function WalletPage({
  params,
  searchParams,
}: {
  params: Promise<{ address: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { address } = await params;
  const sp = await searchParams;
  const decoded = decodeURIComponent(address);
  const parsed = analyzeSchema.safeParse({ address: decoded, limit: sp.limit, depth: sp.depth });
  const limit = parsed.success ? parsed.data.limit : 25;
  const depth = parsed.success ? parsed.data.depth : 1;

  let result: AnalysisResult | undefined;
  let errorCode: string | null = null;
  try {
    result = await analyzeWallet({ address: decoded, limit, depth }, user);
  } catch (err) {
    errorCode = err instanceof AnalysisError ? err.code : 'internal';
  }

  if (!result) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← На главную
        </Link>
        <Alert tone="warning">{errorMessage(errorCode ?? 'internal')}</Alert>
        <p className="break-address font-mono text-xs text-muted-foreground">{decoded}</p>
      </div>
    );
  }

  const [history, labels] = await Promise.all([
    result.address ? getWalletHistory(result.address.raw) : Promise.resolve([]),
    result.address ? listLabelsForAddress(result.address.raw) : Promise.resolve([]),
  ]);

  return (
    <WalletView
      result={result}
      history={history}
      labels={labels}
      currentUser={{ id: user.id, role: user.role }}
      limit={limit}
      depth={depth}
    />
  );
}
