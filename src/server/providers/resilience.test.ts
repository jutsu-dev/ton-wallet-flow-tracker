// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse, delay } from 'msw';
import { setupServer } from 'msw/node';
import { fetchJson } from './http';
import { ProviderRuntime } from './runtime';
import { CircuitBreaker } from './circuit-breaker';
import { TtlCache, createLimiter } from './cache';
import { TonApiProvider } from './tonapi';
import { TonCenterProvider } from './toncenter';
import { ProviderOrchestrator } from './index';
import { syntheticAddress } from '@/test/fixtures';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const baseOpts = {
  provider: 'tonapi',
  timeoutMs: 1000,
  maxRetries: 2,
  allowedHosts: ['tonapi.io'],
  sleep: async () => {},
  random: () => 0,
};

describe('fetchJson resilience', () => {
  it('retries transient 5xx and then succeeds', async () => {
    let calls = 0;
    server.use(
      http.get('https://tonapi.io/retry', () => {
        calls += 1;
        return calls < 2 ? new HttpResponse(null, { status: 500 }) : HttpResponse.json({ ok: true });
      }),
    );
    const result = await fetchJson('https://tonapi.io/retry', baseOpts);
    expect(result.data).toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  it('retries 429 honoring Retry-After then succeeds', async () => {
    let calls = 0;
    server.use(
      http.get('https://tonapi.io/rl', () => {
        calls += 1;
        return calls < 2
          ? new HttpResponse(null, { status: 429, headers: { 'retry-after': '1' } })
          : HttpResponse.json({ ok: true });
      }),
    );
    const result = await fetchJson('https://tonapi.io/rl', baseOpts);
    expect(result.data).toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  it('does not retry a 401 and classifies it', async () => {
    let calls = 0;
    server.use(
      http.get('https://tonapi.io/unauth', () => {
        calls += 1;
        return new HttpResponse(null, { status: 401 });
      }),
    );
    await expect(fetchJson('https://tonapi.io/unauth', baseOpts)).rejects.toMatchObject({
      kind: 'unauthorized',
    });
    expect(calls).toBe(1);
  });

  it('times out a slow response', async () => {
    server.use(
      http.get('https://tonapi.io/slow', async () => {
        await delay(80);
        return HttpResponse.json({ ok: true });
      }),
    );
    await expect(
      fetchJson('https://tonapi.io/slow', { ...baseOpts, timeoutMs: 10, maxRetries: 0 }),
    ).rejects.toMatchObject({ kind: 'timeout' });
  });

  it('blocks a host outside the allowlist (SSRF guard)', async () => {
    await expect(
      fetchJson('https://evil.example.com/x', { ...baseOpts, maxRetries: 0 }),
    ).rejects.toMatchObject({ kind: 'blocked' });
  });
});

describe('circuit breaker via runtime', () => {
  it('opens after the failure threshold and fails fast', async () => {
    server.use(http.get('https://tonapi.io/fail', () => new HttpResponse(null, { status: 500 })));
    const runtime = new ProviderRuntime(
      { name: 'tonapi', timeoutMs: 1000, maxRetries: 0, allowedHosts: ['tonapi.io'], sleep: async () => {}, random: () => 0 },
      new CircuitBreaker(2, 10_000, () => 0),
      new TtlCache<unknown>(() => 0),
      createLimiter(4),
    );
    await expect(runtime.getJson('https://tonapi.io/fail')).rejects.toMatchObject({ kind: 'server_error' });
    await expect(runtime.getJson('https://tonapi.io/fail')).rejects.toMatchObject({ kind: 'server_error' });
    // Breaker is now open: this must fail fast without hitting the network.
    await expect(runtime.getJson('https://tonapi.io/fail')).rejects.toMatchObject({ kind: 'circuit_open' });
  });
});

describe('ProviderOrchestrator fallback', () => {
  const A = syntheticAddress(7);

  function makeRuntime(name: string, host: string) {
    return new ProviderRuntime(
      { name, timeoutMs: 1000, maxRetries: 0, allowedHosts: [host], sleep: async () => {}, random: () => 0 },
      new CircuitBreaker(5, 1000, () => 0),
      new TtlCache<unknown>(() => 0),
      createLimiter(4),
    );
  }

  function makeOrchestrator() {
    const primary = new TonApiProvider({
      baseUrl: 'https://tonapi.io',
      runtime: makeRuntime('tonapi', 'tonapi.io'),
      ttls: { account: 0, events: 0, dns: 0, nft: 0 },
    });
    const fallback = new TonCenterProvider({
      baseUrl: 'https://toncenter.com/api/v3',
      runtime: makeRuntime('toncenter', 'toncenter.com'),
      ttls: { account: 0 },
    });
    return new ProviderOrchestrator(primary, fallback);
  }

  it('falls back to TON Center when TonAPI returns a transient error', async () => {
    server.use(
      http.get('https://tonapi.io/v2/accounts/:id', () => new HttpResponse(null, { status: 500 })),
      http.get('https://toncenter.com/api/v3/accountStates', () =>
        HttpResponse.json({ accounts: [{ address: A.raw, balance: '3000000000', status: 'active' }] }),
      ),
    );
    const result = await makeOrchestrator().getAccount(A.bounceable);
    expect(result.source).toBe('toncenter');
    expect(result.data?.balanceTon).toBe('3');
  });

  it('does not fall back on a non-transient error', async () => {
    server.use(
      http.get('https://tonapi.io/v2/accounts/:id', () => new HttpResponse(null, { status: 401 })),
    );
    await expect(makeOrchestrator().getAccount(A.bounceable)).rejects.toMatchObject({
      kind: 'unauthorized',
    });
  });
});
