import { ProviderError, type ProviderErrorKind } from './types';

// Resilient JSON fetch: SSRF host allowlist, per-request timeout, bounded retries
// with exponential backoff + jitter, Retry-After handling, and error
// classification by status. `sleep`/`random` are injectable so tests run instantly.

export interface FetchJsonOptions {
  provider: string;
  headers?: Record<string, string>;
  timeoutMs: number;
  maxRetries: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  signal?: AbortSignal;
  allowedHosts: string[];
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

export interface FetchJsonResult {
  data: unknown;
  status: number;
}

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function classifyStatus(status: number): ProviderErrorKind {
  if (status === 400) return 'bad_request';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server_error';
  return 'bad_request';
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.min(15_000, Math.max(0, seconds * 1000));
  const date = Date.parse(header);
  if (Number.isFinite(date)) return Math.min(15_000, Math.max(0, date - Date.now()));
  return undefined;
}

function assertAllowedHost(url: string, allowedHosts: string[], provider: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ProviderError('blocked', provider, undefined, 'invalid url');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new ProviderError('blocked', provider, undefined, 'scheme not allowed');
  }
  if (!allowedHosts.includes(parsed.hostname)) {
    throw new ProviderError('blocked', provider, undefined, 'host not allowed');
  }
  return parsed;
}

async function doFetch(url: string, opts: FetchJsonOptions): Promise<FetchJsonResult> {
  const controller = new AbortController();
  let timedOut = false;
  let cancelled = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, opts.timeoutMs);

  const onExternalAbort = () => {
    cancelled = true;
    controller.abort();
  };
  if (opts.signal) {
    if (opts.signal.aborted) {
      clearTimeout(timer);
      throw new ProviderError('cancelled', opts.provider);
    }
    opts.signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  try {
    const response = await fetch(url, {
      headers: opts.headers,
      signal: controller.signal,
      redirect: 'error', // never follow redirects (SSRF hardening)
    });
    if (!response.ok) {
      const error = new ProviderError(classifyStatus(response.status), opts.provider, response.status);
      if (response.status === 429) {
        error.retryAfterMs = parseRetryAfter(response.headers.get('retry-after'));
      }
      throw error;
    }
    try {
      const data = await response.json();
      return { data, status: response.status };
    } catch {
      throw new ProviderError('parse_error', opts.provider, response.status);
    }
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    if (cancelled) throw new ProviderError('cancelled', opts.provider);
    if (timedOut) throw new ProviderError('timeout', opts.provider);
    throw new ProviderError('network', opts.provider, undefined, 'network error');
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onExternalAbort);
  }
}

export async function fetchJson(url: string, opts: FetchJsonOptions): Promise<FetchJsonResult> {
  assertAllowedHost(url, opts.allowedHosts, opts.provider);
  const sleep = opts.sleep ?? defaultSleep;
  const random = opts.random ?? Math.random;
  const baseDelay = opts.baseDelayMs ?? 300;
  const maxDelay = opts.maxDelayMs ?? 4000;

  let attempt = 0;
  for (;;) {
    try {
      return await doFetch(url, opts);
    } catch (err) {
      const error =
        err instanceof ProviderError ? err : new ProviderError('unknown', opts.provider);
      if (!error.transient || attempt >= opts.maxRetries) throw error;
      const backoff =
        error.retryAfterMs ??
        Math.min(maxDelay, baseDelay * 2 ** attempt) + Math.floor(random() * baseDelay);
      attempt += 1;
      await sleep(backoff);
    }
  }
}
