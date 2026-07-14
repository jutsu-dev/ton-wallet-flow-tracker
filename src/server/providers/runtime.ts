import { fetchJson } from './http';
import type { CircuitBreaker } from './circuit-breaker';
import type { TtlCache, Limiter } from './cache';
import { ProviderError } from './types';

export interface RuntimeConfig {
  name: string;
  timeoutMs: number;
  maxRetries: number;
  allowedHosts: string[];
  baseDelayMs?: number;
  maxDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

export interface GetJsonOptions {
  headers?: Record<string, string>;
  cacheKey?: string;
  ttlMs?: number;
  signal?: AbortSignal;
}

/**
 * Ties the HTTP client to a circuit breaker, a TTL cache, and a concurrency
 * limiter. Cache hits skip the network; an open breaker fails fast so the
 * orchestrator can fall back.
 */
export class ProviderRuntime {
  constructor(
    private readonly config: RuntimeConfig,
    private readonly breaker: CircuitBreaker,
    private readonly cache: TtlCache<unknown>,
    private readonly limiter: Limiter,
  ) {}

  async getJson(url: string, opts: GetJsonOptions = {}): Promise<unknown> {
    if (opts.cacheKey) {
      const cached = this.cache.get(opts.cacheKey);
      if (cached !== undefined) return cached;
    }
    if (!this.breaker.canRequest()) {
      throw new ProviderError('circuit_open', this.config.name);
    }
    try {
      const result = await this.limiter(() =>
        fetchJson(url, {
          provider: this.config.name,
          headers: opts.headers,
          timeoutMs: this.config.timeoutMs,
          maxRetries: this.config.maxRetries,
          allowedHosts: this.config.allowedHosts,
          baseDelayMs: this.config.baseDelayMs,
          maxDelayMs: this.config.maxDelayMs,
          signal: opts.signal,
          sleep: this.config.sleep,
          random: this.config.random,
        }),
      );
      this.breaker.onSuccess();
      if (opts.cacheKey && opts.ttlMs) this.cache.set(opts.cacheKey, result.data, opts.ttlMs);
      return result.data;
    } catch (err) {
      const error = err instanceof ProviderError ? err : new ProviderError('unknown', this.config.name);
      if (error.transient) this.breaker.onFailure();
      throw error;
    }
  }
}
