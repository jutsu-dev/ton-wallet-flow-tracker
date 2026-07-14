import type { EdgeAggregate, NodeKind } from '@/domain/graph';
import { formatUnitsCompact } from '@/lib/ton/format';

/** Map a user label type to a graph node kind. Unlabeled nodes are "unknown". */
export function labelTypeToNodeKind(labelType: string | null | undefined): NodeKind {
  switch (labelType) {
    case 'OWN':
      return 'own';
    case 'SAFE':
      return 'safe';
    case 'SUSPICIOUS':
      return 'suspicious';
    case 'SERVICE':
      return 'service';
    case 'EXCHANGE':
      return 'exchange';
    case 'MARKETPLACE':
      return 'marketplace';
    default:
      return 'unknown';
  }
}

/** Human-readable edge label: amount + asset, with a grouped-count suffix. */
export function formatEdgeLabel(edge: EdgeAggregate): string {
  let main: string;
  if (edge.assetType === 'ton') {
    main = `${formatUnitsCompact(edge.totalAmountRaw, 9, 3)} TON`;
  } else if (edge.assetType === 'jetton') {
    const symbol = edge.symbol ?? 'jetton';
    const amount = edge.decimals !== null ? formatUnitsCompact(edge.totalAmountRaw, edge.decimals, 3) : '?';
    main = `${amount} ${symbol}`;
  } else if (edge.assetType === 'nft' || edge.assetType === 'telegram_gift') {
    main = edge.sampleLabel ? `NFT: ${edge.sampleLabel}` : 'NFT';
  } else {
    main = 'вызов контракта';
  }
  return edge.count > 1 ? `${main} ×${edge.count}` : main;
}
