import type { AssetType, WalletAction } from '@/domain/types';
import { toRaw } from '@/lib/ton/address';

// Pure graph construction: turn a list of WalletActions into aggregated edges,
// collect unique nodes, enforce node/edge caps, and pick cycle-safe expansion
// targets. No React, no async — all deterministic and unit-tested.

export const NODE_KINDS = [
  'explored',
  'own',
  'safe',
  'unknown',
  'suspicious',
  'service',
  'exchange',
  'marketplace',
] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export interface EdgeAggregate {
  id: string;
  from: string;
  to: string;
  assetType: AssetType;
  assetKey: string;
  symbol: string | null;
  decimals: number | null;
  totalAmountRaw: string | null;
  count: number;
  hasSuccess: boolean;
  hasFailed: boolean;
  actionIds: string[];
  sampleLabel: string | null;
}

/** Direction of an action relative to a given center address. */
export function directionRelativeTo(
  action: Pick<WalletAction, 'senderAddress' | 'recipientAddress'>,
  centerRaw: string,
): 'in' | 'out' | 'self' | 'unknown' {
  const from = toRaw(action.senderAddress);
  const to = toRaw(action.recipientAddress);
  const isFrom = from !== null && from === centerRaw;
  const isTo = to !== null && to === centerRaw;
  if (isFrom && isTo) return 'self';
  if (isTo) return 'in';
  if (isFrom) return 'out';
  return 'unknown';
}

/** Stable key identifying the asset moved by an action, for edge grouping. */
export function assetKeyOf(action: WalletAction): string {
  switch (action.assetType) {
    case 'ton':
      return 'ton';
    case 'jetton':
      return `jetton:${toRaw(action.assetContractAddress) ?? action.assetContractAddress ?? 'unknown'}`;
    case 'nft':
    case 'telegram_gift':
      return `nft:${toRaw(action.nftAddress) ?? action.nftAddress ?? action.telegramGiftSlug ?? 'unknown'}`;
    default:
      return `unknown:${action.actionType}`;
  }
}

function sumRaw(a: string | null, b: string | null): string | null {
  if (a === null && b === null) return null;
  try {
    return (BigInt(a ?? '0') + BigInt(b ?? '0')).toString();
  } catch {
    return a ?? b;
  }
}

/**
 * Aggregate actions into directed edges keyed by (sender, recipient, asset).
 * Only actions with both sender and recipient resolvable to raw addresses
 * produce edges. Fungible amounts (ton/jetton) are summed; NFT edges count moves.
 */
export function buildEdges(actions: WalletAction[]): EdgeAggregate[] {
  const map = new Map<string, EdgeAggregate>();
  for (const action of actions) {
    const from = toRaw(action.senderAddress);
    const to = toRaw(action.recipientAddress);
    if (from === null || to === null) continue;
    if (from === to) continue;
    const assetKey = assetKeyOf(action);
    const id = `${from}->${to}:${assetKey}`;
    const existing = map.get(id);
    const isFungible = action.assetType === 'ton' || action.assetType === 'jetton';
    const sampleLabel = action.nftName ?? action.assetName ?? null;
    if (existing) {
      existing.count += 1;
      existing.hasSuccess = existing.hasSuccess || action.success;
      existing.hasFailed = existing.hasFailed || !action.success;
      existing.actionIds.push(action.id);
      if (isFungible) existing.totalAmountRaw = sumRaw(existing.totalAmountRaw, action.amountRaw);
      if (existing.symbol === null) existing.symbol = action.assetSymbol;
      if (existing.decimals === null) existing.decimals = action.decimals;
      if (existing.sampleLabel === null) existing.sampleLabel = sampleLabel;
    } else {
      map.set(id, {
        id,
        from,
        to,
        assetType: action.assetType,
        assetKey,
        symbol: action.assetSymbol,
        decimals: action.decimals,
        totalAmountRaw: isFungible ? action.amountRaw : null,
        count: 1,
        hasSuccess: action.success,
        hasFailed: !action.success,
        actionIds: [action.id],
        sampleLabel,
      });
    }
  }
  return [...map.values()];
}

/** Unique raw node addresses referenced by actions, always including the center. */
export function collectNodeAddresses(actions: WalletAction[], centerRaw: string): string[] {
  const set = new Set<string>([centerRaw]);
  for (const action of actions) {
    const from = toRaw(action.senderAddress);
    const to = toRaw(action.recipientAddress);
    if (from !== null) set.add(from);
    if (to !== null) set.add(to);
  }
  return [...set];
}

export interface LimitedGraph {
  nodes: string[];
  edges: EdgeAggregate[];
  truncated: boolean;
  droppedNodes: number;
  droppedEdges: number;
}

/**
 * Trim a graph to at most maxNodes / maxEdges. The center is always kept.
 * Nodes are ranked by total incident edge weight (operation count); edges
 * referencing dropped nodes are removed, then edges are capped by weight.
 */
export function enforceGraphLimits(
  nodes: string[],
  edges: EdgeAggregate[],
  centerRaw: string,
  maxNodes: number,
  maxEdges: number,
): LimitedGraph {
  const withinNodes = nodes.length <= maxNodes;
  const withinEdges = edges.length <= maxEdges;
  if (withinNodes && withinEdges) {
    return { nodes, edges, truncated: false, droppedNodes: 0, droppedEdges: 0 };
  }

  const weight = new Map<string, number>();
  for (const edge of edges) {
    weight.set(edge.from, (weight.get(edge.from) ?? 0) + edge.count);
    weight.set(edge.to, (weight.get(edge.to) ?? 0) + edge.count);
  }

  const ranked = nodes
    .filter((n) => n !== centerRaw)
    .sort((a, b) => (weight.get(b) ?? 0) - (weight.get(a) ?? 0));
  const keptNodes = new Set<string>([centerRaw, ...ranked.slice(0, Math.max(0, maxNodes - 1))]);

  let keptEdges = edges.filter((e) => keptNodes.has(e.from) && keptNodes.has(e.to));
  keptEdges = keptEdges.sort((a, b) => b.count - a.count).slice(0, maxEdges);

  return {
    nodes: [...keptNodes],
    edges: keptEdges,
    truncated: true,
    droppedNodes: nodes.length - keptNodes.size,
    droppedEdges: edges.length - keptEdges.length,
  };
}

/**
 * Cycle-safe selection of the next addresses to expand. Returns [] once the
 * depth limit is reached. Already-visited addresses (and the ones queued in
 * this call) are never returned twice.
 */
export function selectExpansionTargets(
  visited: Set<string>,
  candidates: string[],
  currentDepth: number,
  maxDepth: number,
): string[] {
  if (currentDepth >= maxDepth) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const raw = toRaw(candidate);
    if (raw === null) continue;
    if (visited.has(raw) || seen.has(raw)) continue;
    seen.add(raw);
    out.push(raw);
  }
  return out;
}
