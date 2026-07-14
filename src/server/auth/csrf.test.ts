import { describe, it, expect } from 'vitest';
import { safeEqual, verifyDoubleSubmit, verifyOrigin, generateCsrfToken } from './csrf';

describe('csrf helpers', () => {
  it('safeEqual compares constant-time and by value', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });

  it('generateCsrfToken returns a non-trivial random token', () => {
    const a = generateCsrfToken();
    const b = generateCsrfToken();
    expect(a.length).toBeGreaterThanOrEqual(16);
    expect(a).not.toBe(b);
  });

  it('verifyDoubleSubmit requires both tokens to match', () => {
    expect(verifyDoubleSubmit('token', 'token')).toBe(true);
    expect(verifyDoubleSubmit('token', 'other')).toBe(false);
    expect(verifyDoubleSubmit(undefined, 'token')).toBe(false);
    expect(verifyDoubleSubmit('token', null)).toBe(false);
  });

  it('verifyOrigin matches only the same host', () => {
    expect(verifyOrigin('http://127.0.0.1:8137', 'http://127.0.0.1:8137')).toBe(true);
    expect(verifyOrigin('http://evil.example.com', 'http://127.0.0.1:8137')).toBe(false);
    expect(verifyOrigin(null, 'http://127.0.0.1:8137')).toBe(false);
  });
});
