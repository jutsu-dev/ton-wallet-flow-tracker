import { Address } from '@ton/core';

// TON address handling. Uses @ton/core so the checksum (CRC16), tag byte, and
// workchain parsing are the canonical implementations rather than hand-rolled.
// This module is safe to run in Node (tests) and on the server. Do not import it
// into client components — keep @ton/core out of the browser bundle.

export interface NormalizedAddress {
  /** The trimmed original input. */
  input: string;
  /** Canonical raw form: "workchain:hex64". */
  raw: string;
  /** Friendly bounceable (EQ…), url-safe. */
  bounceable: string;
  /** Friendly non-bounceable (UQ…), url-safe. */
  nonBounceable: string;
  workchain: number;
  testOnly: boolean;
}

function clean(input: unknown): string {
  return typeof input === 'string' ? input.trim() : '';
}

/** True if the input parses as a raw or friendly TON address (checksum verified). */
export function isValidAddress(input: unknown): boolean {
  const s = clean(input);
  if (!s) return false;
  try {
    if (Address.isRaw(s)) {
      Address.parseRaw(s);
    } else {
      Address.parseFriendly(s);
    }
    return true;
  } catch {
    return false;
  }
}

/** Normalize any supported address form. Returns null on invalid input. */
export function normalizeAddress(input: unknown): NormalizedAddress | null {
  const s = clean(input);
  if (!s) return null;
  let address: Address;
  let testOnly = false;
  try {
    if (Address.isRaw(s)) {
      address = Address.parseRaw(s);
    } else {
      const parsed = Address.parseFriendly(s);
      address = parsed.address;
      testOnly = parsed.isTestOnly;
    }
  } catch {
    return null;
  }
  return {
    input: s,
    raw: address.toRawString(),
    bounceable: address.toString({ urlSafe: true, bounceable: true, testOnly }),
    nonBounceable: address.toString({ urlSafe: true, bounceable: false, testOnly }),
    workchain: address.workChain,
    testOnly,
  };
}

/** Canonical raw form, or null if invalid. */
export function toRaw(input: unknown): string | null {
  return normalizeAddress(input)?.raw ?? null;
}

/** Compare two addresses by canonical raw form. Invalid inputs never match. */
export function addressesEqual(a: unknown, b: unknown): boolean {
  const ra = toRaw(a);
  const rb = toRaw(b);
  return ra !== null && ra === rb;
}
