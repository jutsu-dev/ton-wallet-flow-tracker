// Format validation for TON DNS names (.ton). Resolution is done by the provider
// layer; this only checks that the input is a plausible, injection-free name.

const LABEL = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?';
const TON_DNS_RE = new RegExp(`^(?:${LABEL}\\.)+ton$`);

/** True if the input looks like a `.ton` domain (one or more labels + .ton). */
export function isTonDomain(input: unknown): boolean {
  if (typeof input !== 'string') return false;
  const s = input.trim().toLowerCase();
  if (s.length < 5 || s.length > 253) return false;
  return TON_DNS_RE.test(s);
}

/** Normalize a `.ton` domain to lowercase, or null if it is not a valid name. */
export function normalizeTonDomain(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const s = input.trim().toLowerCase();
  return isTonDomain(s) ? s : null;
}
