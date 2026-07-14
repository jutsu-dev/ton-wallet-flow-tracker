import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

// CSRF protection: a random token in a readable cookie that the client echoes in
// a request header (double-submit), plus an Origin check on mutating requests.

export const CSRF_COOKIE = 'twft_csrf';
export const CSRF_HEADER = 'x-csrf-token';

export function generateCsrfToken(): string {
  return randomBytes(24).toString('base64url');
}

function fixedHash(value: string): Buffer {
  // Hash to a constant length so timingSafeEqual never sees mismatched sizes.
  return createHash('sha256').update(value).digest();
}

export function safeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  return timingSafeEqual(fixedHash(a), fixedHash(b));
}

/** The header token must equal the cookie token (both present, timing-safe). */
export function verifyDoubleSubmit(
  cookieToken: string | undefined | null,
  headerToken: string | undefined | null,
): boolean {
  if (!cookieToken || !headerToken) return false;
  return safeEqual(cookieToken, headerToken);
}

/** The request Origin must match the application's own host. */
export function verifyOrigin(originHeader: string | null, appUrl: string): boolean {
  if (!originHeader) return false;
  try {
    return new URL(originHeader).host === new URL(appUrl).host;
  } catch {
    return false;
  }
}
