import { describe, it, expect } from 'vitest';
import { isValidAddress, normalizeAddress, toRaw, addressesEqual } from './address';
import { syntheticAddress } from '@/test/fixtures';

const A = syntheticAddress(1);

describe('isValidAddress', () => {
  it('accepts raw, bounceable, and non-bounceable forms', () => {
    expect(isValidAddress(A.raw)).toBe(true);
    expect(isValidAddress(A.bounceable)).toBe(true);
    expect(isValidAddress(A.nonBounceable)).toBe(true);
  });

  it('rejects empty, malformed, and non-string input', () => {
    expect(isValidAddress('')).toBe(false);
    expect(isValidAddress('   ')).toBe(false);
    expect(isValidAddress('not-an-address')).toBe(false);
    expect(isValidAddress('EQ_short')).toBe(false);
    expect(isValidAddress('0:zz')).toBe(false);
    expect(isValidAddress(null)).toBe(false);
    expect(isValidAddress(undefined)).toBe(false);
    expect(isValidAddress(42)).toBe(false);
  });

  it('rejects a friendly address with a corrupted checksum', () => {
    // Flip several characters in the payload; the CRC will not match.
    const broken = `${A.bounceable.slice(0, 6)}AAAA${A.bounceable.slice(10)}`;
    expect(isValidAddress(broken)).toBe(false);
  });
});

describe('normalizeAddress', () => {
  it('produces consistent raw/bounceable/non-bounceable forms', () => {
    const n = normalizeAddress(A.bounceable);
    expect(n).not.toBeNull();
    expect(n?.raw).toBe(A.raw);
    expect(n?.bounceable).toBe(A.bounceable);
    expect(n?.nonBounceable).toBe(A.nonBounceable);
    expect(n?.workchain).toBe(0);
    expect(n?.testOnly).toBe(false);
  });

  it('normalizes all input forms to the same raw address', () => {
    expect(normalizeAddress(A.raw)?.raw).toBe(A.raw);
    expect(normalizeAddress(A.bounceable)?.raw).toBe(A.raw);
    expect(normalizeAddress(A.nonBounceable)?.raw).toBe(A.raw);
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeAddress(`  ${A.bounceable}  `)?.raw).toBe(A.raw);
  });

  it('returns null for invalid input', () => {
    expect(normalizeAddress('garbage')).toBeNull();
    expect(normalizeAddress('')).toBeNull();
    expect(normalizeAddress(null)).toBeNull();
  });
});

describe('addressesEqual', () => {
  it('treats bounceable and non-bounceable of one address as equal', () => {
    expect(addressesEqual(A.bounceable, A.nonBounceable)).toBe(true);
    expect(addressesEqual(A.bounceable, A.raw)).toBe(true);
  });

  it('treats different addresses as not equal', () => {
    const B = syntheticAddress(2);
    expect(addressesEqual(A.raw, B.raw)).toBe(false);
  });

  it('never matches on invalid input', () => {
    expect(addressesEqual('bad', 'bad')).toBe(false);
    expect(addressesEqual(null, null)).toBe(false);
  });
});

describe('toRaw', () => {
  it('returns raw form or null', () => {
    expect(toRaw(A.nonBounceable)).toBe(A.raw);
    expect(toRaw('bad')).toBeNull();
  });
});
