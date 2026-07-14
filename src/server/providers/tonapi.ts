import type {
  AccountSummary,
  ActionType,
  AssetType,
  JettonBalance,
  NftItemSummary,
  WalletAction,
} from '@/domain/types';
import { normalizeAddress, isValidAddress } from '@/lib/ton/address';
import type { NormalizedAddress } from '@/lib/ton/address';
import { formatTon, formatUnits } from '@/lib/ton/format';
import { sanitizeText, stripMarkup } from '@/domain/sanitize';
import { directionRelativeTo } from '@/domain/graph';
import { asAmount, asArray, asNumber, asRecord, asString, extractAddress } from './parse';
import type { ProviderRuntime } from './runtime';
import {
  ProviderError,
  type BlockchainProvider,
  type DnsResolution,
  type EventQuery,
  type EventsPage,
  type ProviderResult,
  type TraceSummary,
  type TransactionSummary,
} from './types';

export interface TonApiTtls {
  account: number;
  events: number;
  dns: number;
  nft: number;
}

export interface TonApiProviderOptions {
  baseUrl: string;
  apiKey?: string;
  runtime: ProviderRuntime;
  ttls: TonApiTtls;
}

function baseAction(id: string, accountRaw: string, timestamp: number, success: boolean): WalletAction {
  return {
    id,
    eventId: null,
    traceId: null,
    transactionHash: null,
    timestamp,
    status: success ? 'ok' : 'failed',
    success,
    direction: 'unknown',
    actionType: 'unknown',
    senderAddress: null,
    recipientAddress: null,
    accountAddress: accountRaw,
    amountRaw: null,
    amountFormatted: null,
    decimals: null,
    assetType: 'unknown',
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
    source: 'tonapi',
    isIncomplete: false,
    rawReference: null,
  };
}

function mapTonApiAction(
  rawAction: unknown,
  eventId: string | null,
  timestamp: number,
  accountRaw: string,
  index: number,
): WalletAction {
  const action = asRecord(rawAction) ?? {};
  const type = asString(action.type) ?? 'Unknown';
  const status = asString(action.status);
  const success = status !== 'failed';
  const id = `${eventId ?? 'event'}:${index}`;
  const detail = asRecord(action[type]) ?? {};

  const result = baseAction(id, accountRaw, timestamp, success);
  result.eventId = eventId;
  result.traceId = eventId;
  result.rawReference = eventId;

  const applyDirection = () => {
    result.direction = directionRelativeTo(
      { senderAddress: result.senderAddress, recipientAddress: result.recipientAddress },
      accountRaw,
    );
  };

  switch (type) {
    case 'TonTransfer': {
      result.actionType = 'ton_transfer';
      result.assetType = 'ton';
      result.decimals = 9;
      result.assetSymbol = 'TON';
      result.senderAddress = extractAddress(detail.sender);
      result.recipientAddress = extractAddress(detail.recipient);
      result.amountRaw = asAmount(detail.amount);
      result.amountFormatted = result.amountRaw ? formatTon(result.amountRaw) : null;
      result.comment = sanitizeText(detail.comment, 1000);
      result.isIncomplete = result.amountRaw === null || !result.senderAddress || !result.recipientAddress;
      break;
    }
    case 'JettonTransfer': {
      const jetton = asRecord(detail.jetton) ?? {};
      const decimals = asNumber(jetton.decimals);
      result.actionType = 'jetton_transfer';
      result.assetType = 'jetton';
      result.senderAddress = extractAddress(detail.sender);
      result.recipientAddress = extractAddress(detail.recipient);
      result.assetContractAddress = asString(jetton.address);
      result.assetSymbol = stripMarkup(jetton.symbol, 32);
      result.assetName = stripMarkup(jetton.name, 120);
      result.decimals = decimals;
      result.amountRaw = asAmount(detail.amount);
      result.amountFormatted =
        result.amountRaw !== null && decimals !== null ? formatUnits(result.amountRaw, decimals) : null;
      result.comment = sanitizeText(detail.comment, 1000);
      result.isIncomplete = result.assetContractAddress === null || result.amountRaw === null;
      break;
    }
    case 'NftItemTransfer': {
      const nft = detail.nft;
      const nftRecord = asRecord(nft);
      result.actionType = 'nft_transfer';
      result.assetType = 'nft';
      result.senderAddress = extractAddress(detail.sender);
      result.recipientAddress = extractAddress(detail.recipient);
      result.nftAddress = extractAddress(nft);
      result.nftName = nftRecord ? stripMarkup(asRecord(nftRecord.metadata)?.name, 120) : null;
      result.nftCollectionAddress = nftRecord ? extractAddress(nftRecord.collection) : null;
      result.comment = sanitizeText(detail.comment, 1000);
      result.isIncomplete = result.nftAddress === null;
      break;
    }
    case 'NftPurchase': {
      const nft = asRecord(detail.nft) ?? {};
      const amount = asRecord(detail.amount) ?? {};
      result.actionType = 'nft_purchase';
      result.assetType = 'nft';
      result.senderAddress = extractAddress(detail.seller);
      result.recipientAddress = extractAddress(detail.buyer);
      result.nftAddress = asString(nft.address);
      result.nftName = stripMarkup(asRecord(nft.metadata)?.name, 120);
      result.nftCollectionAddress = extractAddress(nft.collection);
      result.amountRaw = asAmount(amount.value);
      result.decimals = 9;
      result.assetSymbol = stripMarkup(amount.token_name, 32) ?? 'TON';
      result.amountFormatted = result.amountRaw ? formatTon(result.amountRaw) : null;
      result.isIncomplete = result.nftAddress === null;
      break;
    }
    case 'ContractDeploy':
    case 'SmartContractExec':
    case 'JettonSwap':
    case 'JettonMint':
    case 'JettonBurn':
    case 'DepositStake':
    case 'WithdrawStake':
    case 'AuctionBid':
    case 'Subscribe':
    case 'UnSubscribe': {
      result.actionType = 'contract_call';
      result.assetType = 'unknown';
      result.senderAddress = extractAddress(detail.executor ?? detail.sender ?? detail.address);
      result.recipientAddress = extractAddress(detail.contract ?? detail.recipient);
      result.operationCode = asString(detail.operation);
      const attached = asAmount(detail.ton_attached ?? detail.amount);
      if (attached !== null) {
        result.amountRaw = attached;
        result.decimals = 9;
        result.assetSymbol = 'TON';
        result.amountFormatted = formatTon(attached);
      }
      break;
    }
    default: {
      result.actionType = 'unknown';
      result.assetType = 'unknown';
      result.isIncomplete = true;
    }
  }

  if (!success && result.actionType === 'unknown') {
    result.actionType = 'failed_transfer';
  }
  applyDirection();
  return result;
}

function mapEvent(rawEvent: unknown, accountRaw: string): WalletAction[] {
  const event = asRecord(rawEvent);
  if (!event) return [];
  const eventId = asString(event.event_id);
  const timestamp = asNumber(event.timestamp) ?? 0;
  return asArray(event.actions).map((action, index) =>
    mapTonApiAction(action, eventId, timestamp, accountRaw, index),
  );
}

export class TonApiProvider implements BlockchainProvider {
  readonly name = 'tonapi' as const;
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly runtime: ProviderRuntime;
  private readonly ttls: TonApiTtls;

  constructor(options: TonApiProviderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.runtime = options.runtime;
    this.ttls = options.ttls;
  }

  validateAddress(input: unknown): boolean {
    return isValidAddress(input);
  }

  normalizeAddress(input: unknown): NormalizedAddress | null {
    return normalizeAddress(input);
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;
    return headers;
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private apiAddress(address: string): { apiAddr: string; raw: string } {
    const normalized = normalizeAddress(address);
    if (!normalized) throw new ProviderError('bad_request', this.name, 400, 'invalid address');
    return { apiAddr: normalized.bounceable, raw: normalized.raw };
  }

  async getAccount(address: string, signal?: AbortSignal): Promise<ProviderResult<AccountSummary | null>> {
    const { apiAddr, raw } = this.apiAddress(address);
    try {
      const data = asRecord(
        await this.runtime.getJson(this.url(`/v2/accounts/${encodeURIComponent(apiAddr)}`), {
          headers: this.headers(),
          cacheKey: `tonapi:account:${raw}`,
          ttlMs: this.ttls.account,
          signal,
        }),
      );
      if (!data) return { data: null, source: 'tonapi', incomplete: true, warnings: ['empty account'] };
      const status = asString(data.status);
      const normalized = normalizeAddress(asString(data.address) ?? address);
      const summary: AccountSummary = {
        address: normalized?.raw ?? raw,
        bounceable: normalized?.bounceable ?? apiAddr,
        nonBounceable: normalized?.nonBounceable ?? apiAddr,
        balanceTon: formatTon(asAmount(data.balance)),
        state: status,
        isActive: status === null ? null : status === 'active',
        source: 'tonapi',
        isIncomplete: status === null,
      };
      return { data: summary, source: 'tonapi', incomplete: summary.isIncomplete, warnings: [] };
    } catch (err) {
      if (err instanceof ProviderError && err.kind === 'not_found') {
        return { data: null, source: 'tonapi', incomplete: false, warnings: ['account not found'] };
      }
      throw err;
    }
  }

  async getAccountEvents(address: string, query: EventQuery): Promise<ProviderResult<EventsPage>> {
    const { apiAddr, raw } = this.apiAddress(address);
    const params = new URLSearchParams({ limit: String(query.limit) });
    if (query.cursor) params.set('before_lt', query.cursor);
    const data = asRecord(
      await this.runtime.getJson(
        this.url(`/v2/accounts/${encodeURIComponent(apiAddr)}/events?${params.toString()}`),
        { headers: this.headers(), signal: query.signal },
      ),
    );
    const events = asArray(data?.events);
    const actions = events.flatMap((event) => mapEvent(event, raw));
    const nextFrom = asNumber(data?.next_from) ?? asNumber(data?.next_from_lt);
    const nextCursor = nextFrom && nextFrom > 0 ? String(nextFrom) : null;
    const incomplete = actions.some((a) => a.isIncomplete);
    return { data: { actions, nextCursor }, source: 'tonapi', incomplete, warnings: [] };
  }

  async getNftHistory(nftAddress: string, query: EventQuery): Promise<ProviderResult<EventsPage>> {
    const { apiAddr, raw } = this.apiAddress(nftAddress);
    const params = new URLSearchParams({ limit: String(query.limit) });
    if (query.cursor) params.set('before_lt', query.cursor);
    const data = asRecord(
      await this.runtime.getJson(
        this.url(`/v2/nfts/${encodeURIComponent(apiAddr)}/history?${params.toString()}`),
        { headers: this.headers(), signal: query.signal },
      ),
    );
    const events = asArray(data?.events);
    const actions = events.flatMap((event) => mapEvent(event, raw));
    const nextFrom = asNumber(data?.next_from) ?? asNumber(data?.next_from_lt);
    const nextCursor = nextFrom && nextFrom > 0 ? String(nextFrom) : null;
    return { data: { actions, nextCursor }, source: 'tonapi', incomplete: actions.some((a) => a.isIncomplete), warnings: [] };
  }

  async getJettonBalances(address: string, signal?: AbortSignal): Promise<ProviderResult<JettonBalance[]>> {
    const { apiAddr } = this.apiAddress(address);
    const data = asRecord(
      await this.runtime.getJson(this.url(`/v2/accounts/${encodeURIComponent(apiAddr)}/jettons`), {
        headers: this.headers(),
        signal,
      }),
    );
    let incomplete = false;
    const balances: JettonBalance[] = asArray(data?.balances).flatMap((item) => {
      const record = asRecord(item);
      if (!record) return [];
      const jetton = asRecord(record.jetton) ?? {};
      const contractAddress = asString(jetton.address);
      const decimals = asNumber(jetton.decimals) ?? 9;
      const balanceRaw = asAmount(record.balance) ?? '0';
      if (!contractAddress) incomplete = true;
      return [
        {
          contractAddress: contractAddress ?? 'unknown',
          symbol: stripMarkup(jetton.symbol, 32),
          name: stripMarkup(jetton.name, 120),
          decimals,
          balanceRaw,
          balanceFormatted: formatUnits(balanceRaw, decimals),
          isIncomplete: contractAddress === null,
        },
      ];
    });
    return { data: balances, source: 'tonapi', incomplete, warnings: [] };
  }

  async getNftItems(address: string, query: EventQuery): Promise<ProviderResult<NftItemSummary[]>> {
    const { apiAddr } = this.apiAddress(address);
    const params = new URLSearchParams({ limit: String(query.limit) });
    const data = asRecord(
      await this.runtime.getJson(
        this.url(`/v2/accounts/${encodeURIComponent(apiAddr)}/nfts?${params.toString()}`),
        { headers: this.headers(), signal: query.signal },
      ),
    );
    const items: NftItemSummary[] = asArray(data?.nft_items).flatMap((item) => {
      const record = asRecord(item);
      if (!record) return [];
      const collection = asRecord(record.collection);
      const metadata = asRecord(record.metadata);
      const addr = asString(record.address);
      return [
        {
          address: addr ?? 'unknown',
          name: stripMarkup(metadata?.name, 120),
          collectionAddress: collection ? asString(collection.address) : null,
          collectionName: collection ? stripMarkup(collection.name, 120) : null,
          index: record.index !== undefined ? String(record.index) : null,
          isIncomplete: addr === null,
        },
      ];
    });
    return { data: items, source: 'tonapi', incomplete: items.some((i) => i.isIncomplete), warnings: [] };
  }

  async resolveDns(name: string, signal?: AbortSignal): Promise<ProviderResult<DnsResolution | null>> {
    const domain = name.trim().toLowerCase();
    try {
      const data = asRecord(
        await this.runtime.getJson(this.url(`/v2/dns/${encodeURIComponent(domain)}/resolve`), {
          headers: this.headers(),
          cacheKey: `tonapi:dns:${domain}`,
          ttlMs: this.ttls.dns,
          signal,
        }),
      );
      const wallet = asRecord(data?.wallet);
      const walletAddress = wallet ? asString(wallet.address) : null;
      if (!walletAddress) return { data: null, source: 'tonapi', incomplete: false, warnings: ['no wallet'] };
      const normalized = normalizeAddress(walletAddress);
      return {
        data: { address: normalized?.raw ?? walletAddress },
        source: 'tonapi',
        incomplete: false,
        warnings: [],
      };
    } catch (err) {
      if (err instanceof ProviderError && err.kind === 'not_found') {
        return { data: null, source: 'tonapi', incomplete: false, warnings: ['dns not found'] };
      }
      throw err;
    }
  }

  async getTransactions(address: string, query: EventQuery): Promise<ProviderResult<TransactionSummary[]>> {
    const { apiAddr } = this.apiAddress(address);
    const params = new URLSearchParams({ limit: String(query.limit) });
    const data = asRecord(
      await this.runtime.getJson(
        this.url(`/v2/blockchain/accounts/${encodeURIComponent(apiAddr)}/transactions?${params.toString()}`),
        { headers: this.headers(), signal: query.signal },
      ),
    );
    const transactions: TransactionSummary[] = asArray(data?.transactions).flatMap((tx) => {
      const record = asRecord(tx);
      if (!record) return [];
      return [
        {
          hash: asString(record.hash) ?? 'unknown',
          lt: record.lt !== undefined ? String(record.lt) : null,
          timestamp: asNumber(record.utime),
          success: asRecord(record.compute_phase)?.success !== false,
          account: extractAddress(record.account),
        },
      ];
    });
    return { data: transactions, source: 'tonapi', incomplete: false, warnings: [] };
  }

  async getTrace(traceId: string, signal?: AbortSignal): Promise<ProviderResult<TraceSummary | null>> {
    const data = asRecord(
      await this.runtime.getJson(this.url(`/v2/traces/${encodeURIComponent(traceId)}`), {
        headers: this.headers(),
        signal,
      }),
    );
    if (!data) return { data: null, source: 'tonapi', incomplete: true, warnings: [] };
    const hashes: string[] = [];
    const walk = (node: unknown): void => {
      const record = asRecord(node);
      if (!record) return;
      const tx = asRecord(record.transaction);
      const hash = asString(tx?.hash) ?? asString(record.hash);
      if (hash) hashes.push(hash);
      for (const child of asArray(record.children)) walk(child);
    };
    walk(data);
    return { data: { traceId, transactionHashes: hashes }, source: 'tonapi', incomplete: false, warnings: [] };
  }

  async getTransaction(hash: string, signal?: AbortSignal): Promise<ProviderResult<TransactionSummary | null>> {
    const data = asRecord(
      await this.runtime.getJson(this.url(`/v2/blockchain/transactions/${encodeURIComponent(hash)}`), {
        headers: this.headers(),
        signal,
      }),
    );
    if (!data) return { data: null, source: 'tonapi', incomplete: true, warnings: [] };
    const summary: TransactionSummary = {
      hash: asString(data.hash) ?? hash,
      lt: data.lt !== undefined ? String(data.lt) : null,
      timestamp: asNumber(data.utime),
      success: asRecord(data.compute_phase)?.success !== false,
      account: extractAddress(data.account),
    };
    return { data: summary, source: 'tonapi', incomplete: false, warnings: [] };
  }
}
