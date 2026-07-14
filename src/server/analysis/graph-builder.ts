import type { WalletAction } from '@/domain/types';
import { buildEdges, collectNodeAddresses, enforceGraphLimits } from '@/domain/graph';
import { normalizeAddress } from '@/lib/ton/address';
import { shortenAddress } from '@/lib/utils';
import { formatEdgeLabel, labelTypeToNodeKind } from './format';
import type { GraphEdgeDto, GraphNodeDto, NodeLabelDto } from './types';

export interface BuildGraphOptions {
  centerRaw: string;
  maxNodes: number;
  maxEdges: number;
  labelsByAddress: Map<string, NodeLabelDto[]>;
}

export interface BuiltGraph {
  nodes: GraphNodeDto[];
  edges: GraphEdgeDto[];
  truncated: boolean;
}

export function buildGraphDto(actions: WalletAction[], opts: BuildGraphOptions): BuiltGraph {
  const edges = buildEdges(actions);
  const nodeAddresses = collectNodeAddresses(actions, opts.centerRaw);
  const limited = enforceGraphLimits(nodeAddresses, edges, opts.centerRaw, opts.maxNodes, opts.maxEdges);

  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  for (const edge of limited.edges) {
    outgoing.set(edge.from, (outgoing.get(edge.from) ?? 0) + edge.count);
    incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + edge.count);
  }

  const kept = new Set(limited.nodes);
  const nodes: GraphNodeDto[] = limited.nodes.map((raw) => {
    const normalized = normalizeAddress(raw);
    const bounceable = normalized?.bounceable ?? raw;
    const labels = opts.labelsByAddress.get(raw) ?? [];
    const isCenter = raw === opts.centerRaw;
    return {
      address: raw,
      bounceable,
      short: shortenAddress(bounceable, 6, 4),
      isCenter,
      kind: isCenter ? 'explored' : labelTypeToNodeKind(labels[0]?.labelType),
      incoming: incoming.get(raw) ?? 0,
      outgoing: outgoing.get(raw) ?? 0,
      labels,
    };
  });

  const edgeDtos: GraphEdgeDto[] = limited.edges
    .filter((edge) => kept.has(edge.from) && kept.has(edge.to))
    .map((edge) => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      assetType: edge.assetType,
      label: formatEdgeLabel(edge),
      count: edge.count,
      hasFailed: edge.hasFailed,
      hasSuccess: edge.hasSuccess,
    }));

  return { nodes, edges: edgeDtos, truncated: limited.truncated };
}
