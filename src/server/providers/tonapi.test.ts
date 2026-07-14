// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { TonApiProvider } from './tonapi';
import { ProviderRuntime } from './runtime';
import { CircuitBreaker } from './circuit-breaker';
import { TtlCache, createLimiter } from './cache';
import { syntheticAddress } from '@/test/fixtures';

const A = syntheticAddress(1);
const B = syntheticAddress(2);
const C = syntheticAddress(3);
const JETTON = syntheticAddress(4);
const NFT = syntheticAddress(5);
const COLLECTION = syntheticAddress(6);

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeProvider() {
  const runtime = new ProviderRuntime(
    {
      name: 'tonapi',
      timeoutMs: 1000,
      maxRetries: 1,
      allowedHosts: ['tonapi.io'],
      baseDelayMs: 1,
      maxDelayMs: 2,
      sleep: async () => {},
      random: () => 0,
    },
    new CircuitBreaker(5, 1000, () => 0),
    new TtlCache<unknown>(() => 0),
    createLimiter(8),
  );
  return new TonApiProvider({
    baseUrl: 'https://tonapi.io',
    apiKey: 'test-key',
    runtime,
    ttls: { account: 0, events: 0, dns: 0, nft: 0 },
  });
}

describe('TonApiProvider.getAccount', () => {
  it('maps balance and status', async () => {
    server.use(
      http.get('https://tonapi.io/v2/accounts/:id', () =>
        HttpResponse.json({ address: A.raw, balance: 5_000_000_000, status: 'active' }),
      ),
    );
    const result = await makeProvider().getAccount(A.bounceable);
    expect(result.source).toBe('tonapi');
    expect(result.data?.balanceTon).toBe('5');
    expect(result.data?.state).toBe('active');
    expect(result.data?.isActive).toBe(true);
    expect(result.data?.address).toBe(A.raw);
  });

  it('returns null on 404', async () => {
    server.use(
      http.get('https://tonapi.io/v2/accounts/:id', () => new HttpResponse(null, { status: 404 })),
    );
    const result = await makeProvider().getAccount(A.bounceable);
    expect(result.data).toBeNull();
  });
});

describe('TonApiProvider.getAccountEvents', () => {
  it('maps ton, jetton, and nft transfers into normalized actions', async () => {
    server.use(
      http.get('https://tonapi.io/v2/accounts/:id/events', () =>
        HttpResponse.json({
          events: [
            {
              event_id: 'evt1',
              timestamp: 1_700_000_000,
              actions: [
                {
                  type: 'TonTransfer',
                  status: 'ok',
                  TonTransfer: {
                    sender: { address: A.raw },
                    recipient: { address: B.raw },
                    amount: 1_500_000_000,
                    comment: 'hello',
                  },
                },
                {
                  type: 'JettonTransfer',
                  status: 'ok',
                  JettonTransfer: {
                    sender: { address: A.raw },
                    recipient: { address: C.raw },
                    amount: '1000000',
                    jetton: { address: JETTON.raw, decimals: 6, symbol: 'USDT', name: 'Tether' },
                  },
                },
                {
                  type: 'NftItemTransfer',
                  status: 'ok',
                  NftItemTransfer: {
                    sender: { address: A.raw },
                    recipient: { address: B.raw },
                    nft: NFT.raw,
                  },
                },
                {
                  type: 'SmartContractExec',
                  status: 'failed',
                  SmartContractExec: { executor: { address: A.raw }, contract: { address: C.raw } },
                },
              ],
            },
          ],
          next_from: 0,
        }),
      ),
    );

    const result = await makeProvider().getAccountEvents(A.bounceable, { limit: 10 });
    const [ton, jetton, nft, exec] = result.data.actions;

    expect(ton?.actionType).toBe('ton_transfer');
    expect(ton?.assetType).toBe('ton');
    expect(ton?.amountRaw).toBe('1500000000');
    expect(ton?.amountFormatted).toBe('1.5');
    expect(ton?.direction).toBe('out');
    expect(ton?.comment).toBe('hello');
    expect(ton?.isIncomplete).toBe(false);

    expect(jetton?.actionType).toBe('jetton_transfer');
    expect(jetton?.assetContractAddress).toBe(JETTON.raw);
    expect(jetton?.decimals).toBe(6);
    expect(jetton?.amountFormatted).toBe('1');
    expect(jetton?.assetSymbol).toBe('USDT');

    expect(nft?.actionType).toBe('nft_transfer');
    expect(nft?.nftAddress).toBe(NFT.raw);

    expect(exec?.actionType).toBe('contract_call');
    expect(exec?.success).toBe(false);

    expect(result.data.nextCursor).toBeNull();
  });
});

describe('TonApiProvider assets and dns', () => {
  it('maps jetton balances', async () => {
    server.use(
      http.get('https://tonapi.io/v2/accounts/:id/jettons', () =>
        HttpResponse.json({
          balances: [
            { balance: '2000000', jetton: { address: JETTON.raw, decimals: 6, symbol: 'USDT', name: 'Tether' } },
          ],
        }),
      ),
    );
    const result = await makeProvider().getJettonBalances(A.bounceable);
    expect(result.data[0]?.balanceFormatted).toBe('2');
    expect(result.data[0]?.symbol).toBe('USDT');
  });

  it('maps nft items', async () => {
    server.use(
      http.get('https://tonapi.io/v2/accounts/:id/nfts', () =>
        HttpResponse.json({
          nft_items: [
            {
              address: NFT.raw,
              index: 5,
              collection: { address: COLLECTION.raw, name: 'Cigars' },
              metadata: { name: 'Cigar #1' },
            },
          ],
        }),
      ),
    );
    const result = await makeProvider().getNftItems(A.bounceable, { limit: 10 });
    expect(result.data[0]?.name).toBe('Cigar #1');
    expect(result.data[0]?.collectionAddress).toBe(COLLECTION.raw);
  });

  it('resolves a .ton domain', async () => {
    server.use(
      http.get('https://tonapi.io/v2/dns/:domain/resolve', () =>
        HttpResponse.json({ wallet: { address: A.raw } }),
      ),
    );
    const result = await makeProvider().resolveDns('example.ton');
    expect(result.data?.address).toBe(A.raw);
  });
});
