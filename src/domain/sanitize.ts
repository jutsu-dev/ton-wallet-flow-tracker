// Sanitization for untrusted display strings coming from on-chain metadata:
// token names, NFT names, comments, memos, and external URLs. We never trust
// these values and never render them as HTML.

/**
 * Drop C0 control characters and DEL, keeping tab (9), newline (10) and
 * carriage return (13) so the whitespace collapse in sanitizeText can turn
 * them into single spaces. Implemented by char code to avoid embedding raw
 * control bytes in source.
 */
function stripControlChars(input: string): string {
  let out = '';
  for (const ch of input) {
    const code = ch.codePointAt(0);
    if (code === undefined) continue;
    if (code === 9 || code === 10 || code === 13) {
      out += ch;
      continue;
    }
    if (code < 32 || code === 127) continue;
    out += ch;
  }
  return out;
}

/**
 * Normalize and clean a free-text string: drop control characters, collapse
 * whitespace, cap length. Returns null for empty/non-string input. Angle
 * brackets are kept (React escapes on render); use stripMarkup for contexts
 * that serialize to markup directly (e.g. SVG export).
 */
export function sanitizeText(input: unknown, maxLength = 500): string | null {
  if (typeof input !== 'string') return null;
  let s = stripControlChars(input.normalize('NFC'));
  s = s.replace(/\s+/g, ' ').trim();
  if (!s) return null;
  if (s.length > maxLength) s = `${s.slice(0, maxLength)}…`;
  return s;
}

/** Like sanitizeText, but also removes tag-like sequences and stray angle brackets. */
export function stripMarkup(input: unknown, maxLength = 500): string | null {
  const s = sanitizeText(input, maxLength);
  if (s === null) return null;
  const cleaned = s
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .trim();
  return cleaned || null;
}

/** Allow only http(s) URLs. Returns a normalized URL or null. Blocks javascript:, data:, etc. */
export function sanitizeUrl(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const s = input.trim();
  if (!s || s.length > 2048) return null;
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  return url.toString();
}
