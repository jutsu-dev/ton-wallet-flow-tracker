import { describe, it, expect } from 'vitest';
import {
  directionRelativeTo,
  assetKeyOf,
  buildEdges,
  collectNodeAddresses,
  enforceGraphLimits,
  selectExpansionTargets,
  type EdgeAggregate,
} from './graph';
import { makeAction, syntheticAddress } from '@/test/fixtures';

const A = syntheticAddress(1);
const B = syntheticAddress(2);
const C = syntheticAddress(3);

describe('directionRelativeTo', () => {
  it('classifies in/out/self/unknown by canonical address', () => {
    expect(directionRelativeTo({ senderAddress: A.bounceable, recipientAddress: B.raw }, A.raw)).toBe('out');
    expect(directionRelativeTo({ senderAddress: B.raw, recipientAddress: A.nonBounceable }, A.raw)).toBe('in');
    expect(directionRelativeTo({ senderAddress: A.raw, recipientAddress: A.bounceable }, A.raw)).toBe('self');
    expect(directionRelativeTo({ senderAddress: B.raw, recipientAddress: C.raw }, A.raw)).toBe('unknown');
    expect(directionRelativeTo({ senderAddress: null, recipientAddress: null }, A.raw)).toBe('unknown');
  });
});

describe('assetKeyOf', () => {
  it('keys assets by their canonical identity, not name', () => {
    expect(assetKeyOf(makeAction({ assetType: 'ton' }))).toBe('ton');
    expect(assetKeyOf(makeAction({ assetType: 'jetton', assetContractAddress: C.bounceable }))).toBe(
      `jetton:${C.raw}`,
    );
    expect(assetKeyOf(makeAction({ assetType: 'nft', nftAddress: B.raw }))).toBe(`nft:${B.raw}`);
    expect(assetKeyOf(makeAction({ assetType: 'unknown', actionType: 'contract_call' }))).toBe(
      'unknown:contract_call',
    );
  });
});

describe('buildEdges', () => {
  const nft = syntheticAddress(9);
  const actions = [
    makeAction({ id: '1', senderAddress: A.raw, recipientAddress: B.raw, assetType: 'ton', amountRaw: '1000000000' }),
    makeAction({ id: '2', senderAddress: A.bounceable, recipientAddress: B.nonBounceable, assetType: 'ton', amountRaw: '2000000000' }),
    makeAction({ id: '3', senderAddress: A.raw, recipientAddress: B.raw, assetType: 'ton', amountRaw: '500000000', success: false }),
    makeAction({ id: '4', senderAddress: A.raw, recipientAddress: C.raw, assetType: 'nft', nftAddress: nft.raw, nftName: 'Cigar #1' }),
    makeAction({ id: '5', senderAddress: A.raw, recipientAddress: A.raw }), // self -> skipped
    makeAction({ id: '6', senderAddress: null, recipientAddress: B.raw }), // no sender -> skipped
  ];

  it('aggregates fungible transfers and separates assets', () => {
    const edges = buildEdges(actions);
    expect(edges).toHaveLength(2);

    const ton = edges.find((e) => e.assetType === 'ton') as EdgeAggregate;
    expect(ton.from).toBe(A.raw);
    expect(ton.to).toBe(B.raw);
    expect(ton.count).toBe(3);
    expect(ton.totalAmountRaw).toBe('3500000000');
    expect(ton.hasSuccess).toBe(true);
    expect(ton.hasFailed).toBe(true);
    expect(ton.actionIds).toEqual(['1', '2', '3']);

    const nftEdge = edges.find((e) => e.assetType === 'nft') as EdgeAggregate;
    expect(nftEdge.count).toBe(1);
    expect(nftEdge.totalAmountRaw).toBeNull();
    expect(nftEdge.sampleLabel).toBe('Cigar #1');
  });
});

describe('collectNodeAddresses', () => {
  it('returns unique nodes and always includes the center', () => {
    const actions = [
      makeAction({ senderAddress: A.raw, recipientAddress: B.raw }),
      makeAction({ senderAddress: B.raw, recipientAddress: C.raw }),
    ];
    const nodes = collectNodeAddresses(actions, A.raw);
    expect(new Set(nodes)).toEqual(new Set([A.raw, B.raw, C.raw]));
  });
});

describe('enforceGraphLimits', () => {
  it('keeps the center and trims to the caps by weight', () => {
    const targets = Array.from({ length: 10 }, (_, i) => syntheticAddress(10 + i));
    const nodes = [A.raw, ...targets.map((t) => t.raw)];
    const edges: EdgeAggregate[] = targets.map((t, i) => ({
      id: `${A.raw}->${t.raw}:ton`,
      from: A.raw,
      to: t.raw,
      assetType: 'ton',
      assetKey: 'ton',
      symbol: 'TON',
      decimals: 9,
      totalAmountRaw: '1',
      count: i + 1,
      hasSuccess: true,
      hasFailed: false,
      actionIds: [`${i}`],
      sampleLabel: null,
    }));

    const limited = enforceGraphLimits(nodes, edges, A.raw, 5, 4);
    expect(limited.truncated).toBe(true);
    expect(limited.nodes).toHaveLength(5);
    expect(limited.nodes).toContain(A.raw);
    expect(limited.edges.length).toBeLessThanOrEqual(4);
    expect(limited.droppedNodes).toBe(6);
    // The highest-weight target (last one) must survive.
    const strongest = targets[targets.length - 1]!.raw;
    expect(limited.nodes).toContain(strongest);
  });

  it('does not trim when within limits', () => {
    const nodes = [A.raw, B.raw];
    const edges: EdgeAggregate[] = [];
    const limited = enforceGraphLimits(nodes, edges, A.raw, 150, 300);
    expect(limited.truncated).toBe(false);
    expect(limited.nodes).toEqual(nodes);
  });
});

describe('selectExpansionTargets', () => {
  it('skips visited nodes and stops at the depth limit', () => {
    const visited = new Set<string>([A.raw]);
    expect(selectExpansionTargets(visited, [A.bounceable, B.raw, C.raw], 0, 2)).toEqual([B.raw, C.raw]);
    expect(selectExpansionTargets(visited, [B.raw, C.raw], 2, 2)).toEqual([]);
  });

  it('deduplicates candidates and drops invalid input', () => {
    const visited = new Set<string>();
    expect(selectExpansionTargets(visited, [B.raw, B.bounceable, 'bad', ''], 0, 3)).toEqual([B.raw]);
  });
});
