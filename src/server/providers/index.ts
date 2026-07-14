import 'server-only';
import type {
  AccountSummary,
  JettonBalance,
  NftItemSummary,
} from '@/domain/types';
import type { NormalizedAddress } from '@/lib/ton/address';
import { getEnv } from '@/lib/env';
import { logger } from '@/lib/log';
import { CircuitBreaker } from './circuit-breaker';
import { TtlCache, createLimiter } from './cache';
import { ProviderRuntime } from './runtime';
import { TonApiProvider } from './tonapi';
import { TonCenterProvider } from './toncenter';
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

export * from './types';

/**
 * Tries the primary provider (TonAPI) and falls back to the secondary
 * (TON Center) only on transient failures. Non-transient errors (bad request,
 * unauthorized) propagate — falling back would not help.
 */
export class ProviderOrchestrator implements BlockchainProvider {
  readonly name = 'tonapi' as const;

  constructor(
    private readonly primary: BlockchainProvider,
    private readonly fallback: BlockchainProvider,
  ) {}

  validateAddress(input: unknown): boolean {
    return this.primary.validateAddress(input);
  }

  normalizeAddress(input: unknown): NormalizedAddress | null {
    return this.primary.normalizeAddress(input);
  }

  private async withFallback<T>(
    op: (provider: BlockchainProvider) => Promise<ProviderResult<T>>,
  ): Promise<ProviderResult<T>> {
    try {
      return await op(this.primary);
    } catch (err) {
      if (err instanceof ProviderError && err.transient) {
        logger.warn('provider fallback', {
          from: this.primary.name,
          to: this.fallback.name,
          kind: err.kind,
        });
        try {
          return await op(this.fallback);
        } catch (fallbackErr) {
          const kind = fallbackErr instanceof ProviderError ? fallbackErr.kind : 'unknown';
          logger.error('both providers failed', { kind });
          throw fallbackErr;
        }
      }
      throw err;
    }
  }

  resolveDns(name: string, signal?: AbortSignal): Promise<ProviderResult<DnsResolution | null>> {
    return this.withFallback((p) => p.resolveDns(name, signal));
  }

  getAccount(address: string, signal?: AbortSignal): Promise<ProviderResult<AccountSummary | null>> {
    return this.withFallback((p) => p.getAccount(address, signal));
  }

  getAccountEvents(address: string, query: EventQuery): Promise<ProviderResult<EventsPage>> {
    return this.withFallback((p) => p.getAccountEvents(address, query));
  }

  getTransactions(address: string, query: EventQuery): Promise<ProviderResult<TransactionSummary[]>> {
    return this.withFallback((p) => p.getTransactions(address, query));
  }

  getJettonBalances(address: string, signal?: AbortSignal): Promise<ProviderResult<JettonBalance[]>> {
    return this.withFallback((p) => p.getJettonBalances(address, signal));
  }

  getNftItems(address: string, query: EventQuery): Promise<ProviderResult<NftItemSummary[]>> {
    return this.withFallback((p) => p.getNftItems(address, query));
  }

  getNftHistory(nftAddress: string, query: EventQuery): Promise<ProviderResult<EventsPage>> {
    return this.withFallback((p) => p.getNftHistory(nftAddress, query));
  }

  getTrace(traceId: string, signal?: AbortSignal): Promise<ProviderResult<TraceSummary | null>> {
    return this.withFallback((p) => p.getTrace(traceId, signal));
  }

  getTransaction(hash: string, signal?: AbortSignal): Promise<ProviderResult<TransactionSummary | null>> {
    return this.withFallback((p) => p.getTransaction(hash, signal));
  }
}

function hostOf(url: string): string {
  return new URL(url).hostname;
}

let cachedProvider: BlockchainProvider | null = null;

/** Build the env-configured orchestrator. Memoized for the process. */
export function getProvider(): BlockchainProvider {
  if (cachedProvider) return cachedProvider;
  const env = getEnv();

  const tonApiRuntime = new ProviderRuntime(
    {
      name: 'tonapi',
      timeoutMs: env.PROVIDER_TIMEOUT_MS,
      maxRetries: env.PROVIDER_MAX_RETRIES,
      allowedHosts: [hostOf(env.TONAPI_BASE_URL)],
    },
    new CircuitBreaker(env.PROVIDER_CIRCUIT_THRESHOLD, env.PROVIDER_CIRCUIT_RESET_MS),
    new TtlCache<unknown>(),
    createLimiter(env.MEMBER_MAX_CONCURRENT_ANALYSES * 4),
  );

  const tonCenterRuntime = new ProviderRuntime(
    {
      name: 'toncenter',
      timeoutMs: env.PROVIDER_TIMEOUT_MS,
      maxRetries: env.PROVIDER_MAX_RETRIES,
      allowedHosts: [hostOf(env.TONCENTER_V3_BASE_URL)],
    },
    new CircuitBreaker(env.PROVIDER_CIRCUIT_THRESHOLD, env.PROVIDER_CIRCUIT_RESET_MS),
    new TtlCache<unknown>(),
    createLimiter(env.MEMBER_MAX_CONCURRENT_ANALYSES * 4),
  );

  const primary = new TonApiProvider({
    baseUrl: env.TONAPI_BASE_URL,
    apiKey: process.env.TONAPI_API_KEY || undefined,
    runtime: tonApiRuntime,
    ttls: {
      account: env.CACHE_TTL_ACCOUNT_MS,
      events: env.CACHE_TTL_EVENTS_MS,
      dns: env.CACHE_TTL_DNS_MS,
      nft: env.CACHE_TTL_NFT_MS,
    },
  });

  const fallback = new TonCenterProvider({
    baseUrl: env.TONCENTER_V3_BASE_URL,
    apiKey: process.env.TONCENTER_API_KEY || undefined,
    runtime: tonCenterRuntime,
    ttls: { account: env.CACHE_TTL_ACCOUNT_MS },
  });

  cachedProvider = new ProviderOrchestrator(primary, fallback);
  return cachedProvider;
}
