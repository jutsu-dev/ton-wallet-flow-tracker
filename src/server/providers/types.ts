import type {
  AccountSummary,
  DataSource,
  JettonBalance,
  NftItemSummary,
  WalletAction,
} from '@/domain/types';
import type { NormalizedAddress } from '@/lib/ton/address';

export type ProviderName = 'tonapi' | 'toncenter';

export type ProviderErrorKind =
  | 'bad_request' // 400
  | 'unauthorized' // 401
  | 'forbidden' // 403
  | 'not_found' // 404
  | 'rate_limited' // 429
  | 'server_error' // 5xx
  | 'timeout'
  | 'network'
  | 'circuit_open'
  | 'blocked' // SSRF allowlist / bad scheme
  | 'cancelled'
  | 'parse_error'
  | 'unknown';

const TRANSIENT: ReadonlySet<ProviderErrorKind> = new Set([
  'rate_limited',
  'server_error',
  'timeout',
  'network',
  'circuit_open',
]);

/** A classified upstream error. Never carries upstream stack traces or headers. */
export class ProviderError extends Error {
  retryAfterMs?: number;
  constructor(
    public readonly kind: ProviderErrorKind,
    public readonly provider: string,
    public readonly status?: number,
    message?: string,
  ) {
    super(message ?? kind);
    this.name = 'ProviderError';
  }

  /** Whether the orchestrator may retry or fall back to the other provider. */
  get transient(): boolean {
    return TRANSIENT.has(this.kind);
  }
}

/** Wraps successful provider data with provenance and completeness metadata. */
export interface ProviderResult<T> {
  data: T;
  source: DataSource;
  incomplete: boolean;
  warnings: string[];
}

export interface EventsPage {
  actions: WalletAction[];
  nextCursor: string | null;
}

export interface DnsResolution {
  address: string;
}

export interface TraceSummary {
  traceId: string;
  transactionHashes: string[];
}

export interface TransactionSummary {
  hash: string;
  lt: string | null;
  timestamp: number | null;
  success: boolean;
  account: string | null;
}

export interface EventQuery {
  limit: number;
  cursor?: string | null;
  signal?: AbortSignal;
}

/**
 * One shape over both TonAPI and TON Center. Read methods return ProviderResult
 * on success and throw ProviderError on failure. Missing values are null, never
 * fabricated; partial responses set `incomplete`.
 */
export interface BlockchainProvider {
  readonly name: ProviderName;
  validateAddress(input: unknown): boolean;
  normalizeAddress(input: unknown): NormalizedAddress | null;
  resolveDns(name: string, signal?: AbortSignal): Promise<ProviderResult<DnsResolution | null>>;
  getAccount(address: string, signal?: AbortSignal): Promise<ProviderResult<AccountSummary | null>>;
  getAccountEvents(address: string, query: EventQuery): Promise<ProviderResult<EventsPage>>;
  getTransactions(address: string, query: EventQuery): Promise<ProviderResult<TransactionSummary[]>>;
  getJettonBalances(address: string, signal?: AbortSignal): Promise<ProviderResult<JettonBalance[]>>;
  getNftItems(address: string, query: EventQuery): Promise<ProviderResult<NftItemSummary[]>>;
  getNftHistory(nftAddress: string, query: EventQuery): Promise<ProviderResult<EventsPage>>;
  getTrace(traceId: string, signal?: AbortSignal): Promise<ProviderResult<TraceSummary | null>>;
  getTransaction(hash: string, signal?: AbortSignal): Promise<ProviderResult<TransactionSummary | null>>;
}
