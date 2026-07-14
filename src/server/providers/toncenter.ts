import type {
  AccountSummary,
  JettonBalance,
  NftItemSummary,
  WalletAction,
} from '@/domain/types';
import { normalizeAddress, isValidAddress } from '@/lib/ton/address';
import type { NormalizedAddress } from '@/lib/ton/address';
import { formatTon, formatUnits } from '@/lib/ton/format';
import { sanitizeText } from '@/domain/sanitize';
import { directionRelativeTo } from '@/domain/graph';
import { asAmount, asArray, asNumber, asRecord, asString } from './parse';
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

export interface TonCenterTtls {
  account: number;
}

export interface TonCenterProviderOptions {
  baseUrl: string;
  apiKey?: string;
  runtime: ProviderRuntime;
  ttls: TonCenterTtls;
}

// TON Center v3 has no "events with actions" abstraction, so we map raw
// transaction messages into TON-transfer actions and mark them incomplete.
// Jetton/NFT semantics are not reconstructed here — that is what TonAPI is for.

function tonTransferAction(
  hash: string,
  timestamp: number,
  success: boolean,
  sender: string | null,
  recipient: string | null,
  amountRaw: string | null,
  comment: string | null,
  accountRaw: string,
  index: number,
): WalletAction {
  return {
    id: `${hash}:${index}`,
    eventId: null,
    traceId: null,
    transactionHash: hash,
    timestamp,
    status: success ? 'ok' : 'failed',
    success,
    direction: directionRelativeTo({ senderAddress: sender, recipientAddress: recipient }, accountRaw),
    actionType: success ? 'ton_transfer' : 'failed_transfer',
    senderAddress: sender,
    recipientAddress: recipient,
    accountAddress: accountRaw,
    amountRaw,
    amountFormatted: amountRaw ? formatTon(amountRaw) : null,
    decimals: 9,
    assetType: 'ton',
    assetSymbol: 'TON',
    assetName: null,
    assetContractAddress: null,
    nftAddress: null,
    nftName: null,
    nftCollectionAddress: null,
    nftCollectionName: null,
    telegramGiftSlug: null,
    telegramGiftNumber: null,
    comment,
    memo: null,
    operationCode: null,
    source: 'toncenter',
    // Fallback view cannot see jetton/NFT movements, so it is always partial.
    isIncomplete: true,
    rawReference: hash,
  };
}

function decodedComment(msg: Record<string, unknown>): string | null {
  const content = asRecord(msg.message_content);
  const decoded = asRecord(content?.decoded);
  return sanitizeText(decoded?.comment, 1000);
}

function mapTransaction(rawTx: unknown, accountRaw: string): WalletAction[] {
  const tx = asRecord(rawTx);
  if (!tx) return [];
  const hash = asString(tx.hash) ?? 'unknown';
  const timestamp = asNumber(tx.now) ?? 0;
  const description = asRecord(tx.description);
  const success = description?.aborted !== true;
  const actions: WalletAction[] = [];

  const inMsg = asRecord(tx.in_msg);
  if (inMsg) {
    const value = asAmount(inMsg.value);
    const source = asString(inMsg.source);
    const destination = asString(inMsg.destination);
    if (value && value !== '0' && source) {
      actions.push(
        tonTransferAction(hash, timestamp, success, source, destination, value, decodedComment(inMsg), accountRaw, actions.length),
      );
    }
  }

  for (const rawOut of asArray(tx.out_msgs)) {
    const out = asRecord(rawOut);
    if (!out) continue;
    const value = asAmount(out.value);
    const source = asString(out.source);
    const destination = asString(out.destination);
    if (value && value !== '0' && destination) {
      actions.push(
        tonTransferAction(hash, timestamp, success, source, destination, value, decodedComment(out), accountRaw, actions.length),
      );
    }
  }

  return actions;
}

export class TonCenterProvider implements BlockchainProvider {
  readonly name = 'toncenter' as const;
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly runtime: ProviderRuntime;
  private readonly ttls: TonCenterTtls;

  constructor(options: TonCenterProviderOptions) {
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
    if (this.apiKey) headers['X-API-Key'] = this.apiKey;
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
    const params = new URLSearchParams({ address: apiAddr });
    const data = asRecord(
      await this.runtime.getJson(this.url(`/accountStates?${params.toString()}`), {
        headers: this.headers(),
        cacheKey: `toncenter:account:${raw}`,
        ttlMs: this.ttls.account,
        signal,
      }),
    );
    const account = asRecord(asArray(data?.accounts)[0]);
    if (!account) return { data: null, source: 'toncenter', incomplete: false, warnings: ['account not found'] };
    const status = asString(account.status);
    const normalized = normalizeAddress(asString(account.address) ?? address);
    const summary: AccountSummary = {
      address: normalized?.raw ?? raw,
      bounceable: normalized?.bounceable ?? apiAddr,
      nonBounceable: normalized?.nonBounceable ?? apiAddr,
      balanceTon: formatTon(asAmount(account.balance)),
      state: status,
      isActive: status === null ? null : status === 'active',
      source: 'toncenter',
      isIncomplete: status === null,
    };
    return { data: summary, source: 'toncenter', incomplete: summary.isIncomplete, warnings: [] };
  }

  async getAccountEvents(address: string, query: EventQuery): Promise<ProviderResult<EventsPage>> {
    const { apiAddr, raw } = this.apiAddress(address);
    const params = new URLSearchParams({ account: apiAddr, limit: String(query.limit), sort: 'desc' });
    if (query.cursor) params.set('offset', query.cursor);
    const data = asRecord(
      await this.runtime.getJson(this.url(`/transactions?${params.toString()}`), {
        headers: this.headers(),
        signal: query.signal,
      }),
    );
    const actions = asArray(data?.transactions).flatMap((tx) => mapTransaction(tx, raw));
    return {
      data: { actions, nextCursor: null },
      source: 'toncenter',
      incomplete: true,
      warnings: ['toncenter fallback: only TON transfers are classified'],
    };
  }

  async getTransactions(address: string, query: EventQuery): Promise<ProviderResult<TransactionSummary[]>> {
    const { apiAddr } = this.apiAddress(address);
    const params = new URLSearchParams({ account: apiAddr, limit: String(query.limit), sort: 'desc' });
    const data = asRecord(
      await this.runtime.getJson(this.url(`/transactions?${params.toString()}`), {
        headers: this.headers(),
        signal: query.signal,
      }),
    );
    const transactions: TransactionSummary[] = asArray(data?.transactions).flatMap((tx) => {
      const record = asRecord(tx);
      if (!record) return [];
      return [
        {
          hash: asString(record.hash) ?? 'unknown',
          lt: record.lt !== undefined ? String(record.lt) : null,
          timestamp: asNumber(record.now),
          success: asRecord(record.description)?.aborted !== true,
          account: asString(record.account),
        },
      ];
    });
    return { data: transactions, source: 'toncenter', incomplete: false, warnings: [] };
  }

  async getJettonBalances(address: string, signal?: AbortSignal): Promise<ProviderResult<JettonBalance[]>> {
    const { apiAddr } = this.apiAddress(address);
    const params = new URLSearchParams({ owner_address: apiAddr, limit: '100' });
    const data = asRecord(
      await this.runtime.getJson(this.url(`/jetton/wallets?${params.toString()}`), {
        headers: this.headers(),
        signal,
      }),
    );
    const balances: JettonBalance[] = asArray(data?.jetton_wallets).flatMap((item) => {
      const record = asRecord(item);
      if (!record) return [];
      const contractAddress = asString(record.jetton);
      const balanceRaw = asAmount(record.balance) ?? '0';
      return [
        {
          contractAddress: contractAddress ?? 'unknown',
          symbol: null,
          name: null,
          decimals: 9,
          balanceRaw,
          balanceFormatted: formatUnits(balanceRaw, 9),
          // Master metadata (symbol/decimals) is not resolved on the fallback path.
          isIncomplete: true,
        },
      ];
    });
    return { data: balances, source: 'toncenter', incomplete: true, warnings: ['jetton metadata not resolved'] };
  }

  async getNftItems(address: string, query: EventQuery): Promise<ProviderResult<NftItemSummary[]>> {
    const { apiAddr } = this.apiAddress(address);
    const params = new URLSearchParams({ owner_address: apiAddr, limit: String(query.limit) });
    const data = asRecord(
      await this.runtime.getJson(this.url(`/nft/items?${params.toString()}`), {
        headers: this.headers(),
        signal: query.signal,
      }),
    );
    const items: NftItemSummary[] = asArray(data?.nft_items).flatMap((item) => {
      const record = asRecord(item);
      if (!record) return [];
      const addr = asString(record.address);
      return [
        {
          address: addr ?? 'unknown',
          name: null,
          collectionAddress: asString(record.collection_address),
          collectionName: null,
          index: record.index !== undefined ? String(record.index) : null,
          isIncomplete: true,
        },
      ];
    });
    return { data: items, source: 'toncenter', incomplete: true, warnings: [] };
  }

  async getNftHistory(nftAddress: string, query: EventQuery): Promise<ProviderResult<EventsPage>> {
    const { apiAddr, raw } = this.apiAddress(nftAddress);
    const params = new URLSearchParams({ address: apiAddr, limit: String(query.limit), sort: 'desc' });
    const data = asRecord(
      await this.runtime.getJson(this.url(`/nft/transfers?${params.toString()}`), {
        headers: this.headers(),
        signal: query.signal,
      }),
    );
    const actions: WalletAction[] = asArray(data?.nft_transfers).flatMap((item, index) => {
      const record = asRecord(item);
      if (!record) return [];
      const success = true;
      const action = tonTransferAction(
        asString(record.transaction_hash) ?? 'unknown',
        asNumber(record.transaction_now) ?? 0,
        success,
        asString(record.old_owner),
        asString(record.new_owner),
        null,
        null,
        raw,
        index,
      );
      action.actionType = 'nft_transfer';
      action.assetType = 'nft';
      action.assetSymbol = null;
      action.nftAddress = asString(record.nft_address) ?? raw;
      return [action];
    });
    return { data: { actions, nextCursor: null }, source: 'toncenter', incomplete: true, warnings: [] };
  }

  async resolveDns(): Promise<ProviderResult<DnsResolution | null>> {
    return { data: null, source: 'toncenter', incomplete: true, warnings: ['dns resolution not supported on fallback'] };
  }

  async getTrace(traceId: string): Promise<ProviderResult<TraceSummary | null>> {
    return { data: { traceId, transactionHashes: [] }, source: 'toncenter', incomplete: true, warnings: ['trace not supported on fallback'] };
  }

  async getTransaction(hash: string, signal?: AbortSignal): Promise<ProviderResult<TransactionSummary | null>> {
    const params = new URLSearchParams({ hash, limit: '1' });
    const data = asRecord(
      await this.runtime.getJson(this.url(`/transactions?${params.toString()}`), {
        headers: this.headers(),
        signal,
      }),
    );
    const tx = asRecord(asArray(data?.transactions)[0]);
    if (!tx) return { data: null, source: 'toncenter', incomplete: false, warnings: [] };
    return {
      data: {
        hash: asString(tx.hash) ?? hash,
        lt: tx.lt !== undefined ? String(tx.lt) : null,
        timestamp: asNumber(tx.now),
        success: asRecord(tx.description)?.aborted !== true,
        account: asString(tx.account),
      },
      source: 'toncenter',
      incomplete: false,
      warnings: [],
    };
  }
}
