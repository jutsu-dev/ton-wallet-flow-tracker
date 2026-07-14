// Amount formatting with BigInt so we never lose precision on large token values.

export const TON_DECIMALS = 9;

/**
 * Format a raw integer amount with the given number of decimals, trimming
 * trailing fractional zeros. Returns "0" for unparseable input rather than
 * throwing — callers treat missing amounts as null upstream.
 */
export function formatUnits(raw: string | bigint | null | undefined, decimals: number): string {
  if (raw === null || raw === undefined || raw === '') return '0';
  let value: bigint;
  try {
    value = typeof raw === 'bigint' ? raw : BigInt(raw);
  } catch {
    return '0';
  }
  if (!Number.isFinite(decimals) || decimals <= 0) return value.toString();

  const negative = value < 0n;
  const abs = negative ? -value : value;
  const base = 10n ** BigInt(Math.floor(decimals));
  const whole = abs / base;
  const frac = abs % base;
  const fracStr = frac
    .toString()
    .padStart(Math.floor(decimals), '0')
    .replace(/0+$/, '');
  const sign = negative ? '-' : '';
  return fracStr ? `${sign}${whole}.${fracStr}` : `${sign}${whole}`;
}

/** Format nanoton to TON. */
export function formatTon(nano: string | bigint | null | undefined): string {
  return formatUnits(nano, TON_DECIMALS);
}

/** Like formatUnits but caps the number of fractional digits for compact display. */
export function formatUnitsCompact(
  raw: string | bigint | null | undefined,
  decimals: number,
  maxFractionDigits = 4,
): string {
  const full = formatUnits(raw, decimals);
  const parts = full.split('.');
  const whole = parts[0] ?? '0';
  const frac = parts[1];
  if (!frac) return whole;
  const trimmed = frac.slice(0, Math.max(0, maxFractionDigits)).replace(/0+$/, '');
  return trimmed ? `${whole}.${trimmed}` : whole;
}
