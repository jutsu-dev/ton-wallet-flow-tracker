import 'server-only';
import type { DataSource, JettonBalance, NftItemSummary } from '@/domain/types';
import { getEnv } from '@/lib/env';
import { getProvider } from '@/server/providers';
import { getDemoAssets } from '@/server/demo/fixtures';

export interface WalletAssets {
  jettons: JettonBalance[];
  nftItems: NftItemSummary[];
  nftCount: number;
  source: DataSource;
  incomplete: boolean;
}

export async function getWalletAssets(rawAddress: string): Promise<WalletAssets> {
  const env = getEnv();
  if (env.DEMO_MODE) return getDemoAssets();

  const provider = getProvider();
  let jettons: JettonBalance[] = [];
  let nftItems: NftItemSummary[] = [];
  let source: DataSource = 'tonapi';
  let incomplete = false;

  try {
    const result = await provider.getJettonBalances(rawAddress);
    jettons = result.data;
    source = result.source;
    incomplete = incomplete || result.incomplete;
  } catch {
    incomplete = true;
  }
  try {
    const result = await provider.getNftItems(rawAddress, { limit: 50 });
    nftItems = result.data;
    incomplete = incomplete || result.incomplete;
  } catch {
    incomplete = true;
  }

  return { jettons, nftItems, nftCount: nftItems.length, source, incomplete };
}
