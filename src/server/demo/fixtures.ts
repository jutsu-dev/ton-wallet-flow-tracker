import { Address } from '@ton/core';
import type {
  AccountSummary,
  DataSource,
  JettonBalance,
  NftItemSummary,
  WalletAction,
} from '@/domain/types';
import { formatTon } from '@/lib/ton/format';
import { buildGraphDto } from '@/server/analysis/graph-builder';
import type { AnalysisResult, ExpansionResult, NodeLabelDto } from '@/server/analysis/types';

// Fully synthetic demo data. No real wallets, no real victims. Used when
// DEMO_MODE=true and by E2E tests so the app runs without any external API.

function synthetic(seed: number): { raw: string; bounceable: string; nonBounceable: string } {
  const hash = Buffer.alloc(32);
  for (let i = 0; i < 32; i += 1) hash[i] = (seed * 41 + i * 13 + 7) & 0xff;
  const address = new Address(0, hash);
  return {
    raw: address.toRawString(),
    bounceable: address.toString({ urlSafe: true, bounceable: true, testOnly: false }),
    nonBounceable: address.toString({ urlSafe: true, bounceable: false, testOnly: false }),
  };
}

const CENTER = synthetic(100);
const EXCHANGE = synthetic(101);
const SERVICE = synthetic(102);
const FRIEND = synthetic(103);
const MARKET = synthetic(104);
const SECOND = synthetic(105);
const JETTON = synthetic(106);
const NFT = synthetic(107);

const TS = 1_720_000_000;

function action(partial: Partial<WalletAction> & Pick<WalletAction, 'id'>): WalletAction {
  return {
    eventId: partial.id,
    traceId: partial.id,
    transactionHash: null,
    timestamp: TS,
    status: 'ok',
    success: true,
    direction: 'unknown',
    actionType: 'ton_transfer',
    senderAddress: null,
    recipientAddress: null,
    accountAddress: CENTER.raw,
    amountRaw: null,
    amountFormatted: null,
    decimals: null,
    assetType: 'ton',
    assetSymbol: null,
    assetName: null,
    assetContractAddress: null,
    nftAddress: null,
    nftName: null,
    nftCollectionAddress: null,
    nftCollectionName: null,
    telegramGiftSlug: null,
    telegramGiftNumber: null,
    comment: null,
    memo: null,
    operationCode: null,
    source: 'demo',
    isIncomplete: false,
    rawReference: null,
    ...partial,
  };
}

const DEMO_ACTIONS: WalletAction[] = [
  action({
    id: 'demo-1',
    direction: 'in',
    actionType: 'ton_transfer',
    senderAddress: EXCHANGE.raw,
    recipientAddress: CENTER.raw,
    amountRaw: '5000000000',
    amountFormatted: '5',
    decimals: 9,
    assetSymbol: 'TON',
    comment: 'Вывод с биржи',
  }),
  action({
    id: 'demo-2',
    direction: 'out',
    actionType: 'ton_transfer',
    senderAddress: CENTER.raw,
    recipientAddress: SERVICE.raw,
    amountRaw: '2000000000',
    amountFormatted: '2',
    decimals: 9,
    assetSymbol: 'TON',
    memo: 'dep_8842',
  }),
  action({
    id: 'demo-3',
    direction: 'out',
    actionType: 'jetton_transfer',
    assetType: 'jetton',
    senderAddress: CENTER.raw,
    recipientAddress: FRIEND.raw,
    amountRaw: '100000000',
    amountFormatted: '100',
    decimals: 6,
    assetSymbol: 'USDT',
    assetName: 'Tether USD',
    assetContractAddress: JETTON.raw,
  }),
  action({
    id: 'demo-4',
    direction: 'out',
    actionType: 'nft_transfer',
    assetType: 'nft',
    senderAddress: CENTER.raw,
    recipientAddress: MARKET.raw,
    nftAddress: NFT.raw,
    nftName: 'Demo Gift #1',
    nftCollectionName: 'Demo Collection',
  }),
  action({
    id: 'demo-5',
    direction: 'out',
    status: 'failed',
    success: false,
    actionType: 'failed_transfer',
    senderAddress: CENTER.raw,
    recipientAddress: SERVICE.raw,
    amountRaw: '1000000000',
    amountFormatted: '1',
    decimals: 9,
    assetSymbol: 'TON',
    comment: 'Ошибка выполнения',
  }),
];

const DEMO_SECOND_LEVEL: WalletAction[] = [
  action({
    id: 'demo-6',
    accountAddress: FRIEND.raw,
    direction: 'out',
    actionType: 'ton_transfer',
    senderAddress: FRIEND.raw,
    recipientAddress: SECOND.raw,
    amountRaw: '500000000',
    amountFormatted: '0.5',
    decimals: 9,
    assetSymbol: 'TON',
  }),
];

const DEMO_LABELS = new Map<string, NodeLabelDto[]>([
  [EXCHANGE.raw, [{ labelType: 'EXCHANGE', title: 'Demo Exchange', note: null }]],
  [SERVICE.raw, [{ labelType: 'SERVICE', title: 'Возможный депозитный сервис', note: 'memo формата dep_' }]],
]);

const DEMO_ACCOUNT: AccountSummary = {
  address: CENTER.raw,
  bounceable: CENTER.bounceable,
  nonBounceable: CENTER.nonBounceable,
  balanceTon: formatTon('3400000000'),
  state: 'active',
  isActive: true,
  source: 'demo',
  isIncomplete: false,
};

export const DEMO_CENTER_ADDRESS = CENTER.bounceable;

export function getDemoAnalysis(): AnalysisResult {
  const graph = buildGraphDto(DEMO_ACTIONS, {
    centerRaw: CENTER.raw,
    maxNodes: 150,
    maxEdges: 300,
    labelsByAddress: DEMO_LABELS,
  });
  return {
    input: CENTER.bounceable,
    address: {
      raw: CENTER.raw,
      bounceable: CENTER.bounceable,
      nonBounceable: CENTER.nonBounceable,
      workchain: 0,
    },
    account: DEMO_ACCOUNT,
    actions: DEMO_ACTIONS,
    nodes: graph.nodes,
    edges: graph.edges,
    source: 'demo',
    incomplete: false,
    warnings: [],
    truncated: false,
    checkId: null,
    demo: true,
  };
}

export interface DemoAssets {
  jettons: JettonBalance[];
  nftItems: NftItemSummary[];
  nftCount: number;
  source: DataSource;
  incomplete: boolean;
}

export function getDemoAssets(): DemoAssets {
  return {
    jettons: [
      {
        contractAddress: JETTON.raw,
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        balanceRaw: '250000000',
        balanceFormatted: '250',
        isIncomplete: false,
      },
    ],
    nftItems: [
      {
        address: NFT.raw,
        name: 'Demo Gift #1',
        collectionAddress: null,
        collectionName: 'Demo Collection',
        index: '1',
        isIncomplete: false,
      },
    ],
    nftCount: 1,
    source: 'demo',
    incomplete: false,
  };
}

export function getDemoExpansion(address: string): ExpansionResult {
  const isFriend = address === FRIEND.raw || address === FRIEND.bounceable;
  const actions = isFriend ? DEMO_SECOND_LEVEL : [];
  const center = isFriend ? FRIEND.raw : address;
  const graph = buildGraphDto(actions, {
    centerRaw: center,
    maxNodes: 150,
    maxEdges: 300,
    labelsByAddress: DEMO_LABELS,
  });
  return {
    center,
    nodes: graph.nodes,
    edges: graph.edges,
    actions,
    source: 'demo',
    incomplete: false,
    warnings: isFriend ? [] : ['В демо-режиме раскрытие доступно только для одного узла.'],
    truncated: false,
  };
}
