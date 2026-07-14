import { describe, it, expect } from 'vitest';
import { formatUnits, formatTon, formatUnitsCompact, TON_DECIMALS } from './format';

describe('formatUnits', () => {
  it('formats whole and fractional amounts', () => {
    expect(formatUnits('1000000000', 9)).toBe('1');
    expect(formatUnits('1500000000', 9)).toBe('1.5');
    expect(formatUnits('1', 9)).toBe('0.000000001');
    expect(formatUnits('0', 9)).toBe('0');
  });

  it('handles zero decimals', () => {
    expect(formatUnits('123', 0)).toBe('123');
  });

  it('handles negative amounts', () => {
    expect(formatUnits('-1500000000', 9)).toBe('-1.5');
  });

  it('keeps full precision for very large values', () => {
    expect(formatUnits('123456789012345678901234567890', 18)).toBe('123456789012.34567890123456789');
  });

  it('accepts bigint input', () => {
    expect(formatUnits(2500000000n, 9)).toBe('2.5');
  });

  it('returns "0" for null, undefined, empty, or garbage', () => {
    expect(formatUnits(null, 9)).toBe('0');
    expect(formatUnits(undefined, 9)).toBe('0');
    expect(formatUnits('', 9)).toBe('0');
    expect(formatUnits('abc', 9)).toBe('0');
  });
});

describe('formatTon', () => {
  it('uses 9 decimals', () => {
    expect(TON_DECIMALS).toBe(9);
    expect(formatTon('1500000000')).toBe('1.5');
    expect(formatTon('1000000000')).toBe('1');
  });
});

describe('formatUnitsCompact', () => {
  it('caps fractional digits and trims trailing zeros', () => {
    expect(formatUnitsCompact('1234567890', 9, 4)).toBe('1.2345');
    expect(formatUnitsCompact('1000000000', 9, 4)).toBe('1');
    expect(formatUnitsCompact('1500000000', 9, 4)).toBe('1.5');
  });
});
