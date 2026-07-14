// Defensive accessors for untrusted upstream JSON. Never throw; return null on
// mismatch so callers can mark results incomplete instead of crashing.

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

/** Integer amount as a decimal string. Accepts string, number, or bigint. */
export function asAmount(value: unknown): string | null {
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(Math.trunc(value));
  if (typeof value === 'bigint') return value.toString();
  return null;
}

/** Extract an address from either a bare string or an { address } object. */
export function extractAddress(value: unknown): string | null {
  if (typeof value === 'string') return value;
  const record = asRecord(value);
  return record ? asString(record.address) : null;
}
