// Normalized, provider-independent domain model. Every provider maps its raw
// response into these shapes so the rest of the app never sees TonAPI/TON Center
// specifics.

export const ACTION_TYPES = [
  'ton_transfer',
  'jetton_transfer',
  'nft_transfer',
  'nft_purchase',
  'nft_sale',
  'contract_call',
  'failed_transfer',
  'unknown',
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const ASSET_TYPES = ['ton', 'jetton', 'nft', 'telegram_gift', 'unknown'] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export type TransferDirection = 'in' | 'out' | 'self' | 'unknown';
export type ActionStatus = 'ok' | 'failed' | 'pending' | 'unknown';

/** Where the data came from. `mixed` means a page combined both providers. */
export type DataSource = 'tonapi' | 'toncenter' | 'mixed' | 'demo';

export interface WalletAction {
  id: string;
  eventId: string | null;
  traceId: string | null;
  transactionHash: string | null;
  /** Unix seconds. */
  timestamp: number;
  status: ActionStatus;
  success: boolean;
  direction: TransferDirection;
  actionType: ActionType;
  senderAddress: string | null;
  recipientAddress: string | null;
  /** The wallet this action was fetched for (canonical raw). */
  accountAddress: string;
  amountRaw: string | null;
  amountFormatted: string | null;
  decimals: number | null;
  assetType: AssetType;
  assetSymbol: string | null;
  assetName: string | null;
  assetContractAddress: string | null;
  nftAddress: string | null;
  nftName: string | null;
  nftCollectionAddress: string | null;
  nftCollectionName: string | null;
  telegramGiftSlug: string | null;
  telegramGiftNumber: number | null;
  comment: string | null;
  memo: string | null;
  operationCode: string | null;
  source: DataSource;
  /** True when the provider response was missing fields we would normally have. */
  isIncomplete: boolean;
  /** Opaque provider reference for debugging/tracing, never rendered as HTML. */
  rawReference: string | null;
}

export interface AccountSummary {
  address: string;
  bounceable: string;
  nonBounceable: string;
  balanceTon: string | null;
  /** Account state, e.g. "active", "uninit", "nonexist". Null if unknown. */
  state: string | null;
  isActive: boolean | null;
  source: DataSource;
  isIncomplete: boolean;
}

export interface JettonBalance {
  contractAddress: string;
  symbol: string | null;
  name: string | null;
  decimals: number;
  balanceRaw: string;
  balanceFormatted: string;
  isIncomplete: boolean;
}

export interface NftItemSummary {
  address: string;
  name: string | null;
  collectionAddress: string | null;
  collectionName: string | null;
  index: string | null;
  isIncomplete: boolean;
}
