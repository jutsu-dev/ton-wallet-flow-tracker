import { Address } from '@ton/core';
import type { WalletAction } from '@/domain/types';

export interface SyntheticAddress {
  raw: string;
  bounceable: string;
  nonBounceable: string;
}

/**
 * Deterministic synthetic TON address (workchain 0) derived from a seed.
 * Used only in tests — never a real wallet, and never the private investigation
 * addresses.
 */
export function syntheticAddress(seed: number): SyntheticAddress {
  const hash = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) hash[i] = (seed * 31 + i * 7 + 1) & 0xff;
  const address = new Address(0, hash);
  return {
    raw: address.toRawString(),
    bounceable: address.toString({ urlSafe: true, bounceable: true, testOnly: false }),
    nonBounceable: address.toString({ urlSafe: true, bounceable: false, testOnly: false }),
  };
}

/** Build a WalletAction with sensible defaults; override any field per test. */
export function makeAction(partial: Partial<WalletAction> = {}): WalletAction {
  const base: WalletAction = {
    id: 'a1',
    eventId: null,
    traceId: null,
    transactionHash: null,
    timestamp: 1_700_000_000,
    status: 'ok',
    success: true,
    direction: 'out',
    actionType: 'ton_transfer',
    senderAddress: null,
    recipientAddress: null,
    accountAddress: syntheticAddress(0).raw,
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
  };
  return { ...base, ...partial };
}
