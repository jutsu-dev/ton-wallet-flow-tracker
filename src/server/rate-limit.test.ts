import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit, resetRateLimits } from './rate-limit';

describe('rateLimit', () => {
  beforeEach(() => resetRateLimits());

  it('allows up to the limit then blocks within the window', () => {
    const now = 1_000_000;
    expect(rateLimit('k', 2, 1000, now).allowed).toBe(true);
    expect(rateLimit('k', 2, 1000, now).allowed).toBe(true);
    const third = rateLimit('k', 2, 1000, now);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it('resets after the window elapses', () => {
    const now = 1_000_000;
    rateLimit('k', 1, 1000, now);
    expect(rateLimit('k', 1, 1000, now).allowed).toBe(false);
    expect(rateLimit('k', 1, 1000, now + 1001).allowed).toBe(true);
  });

  it('tracks keys independently', () => {
    const now = 1_000_000;
    expect(rateLimit('a', 1, 1000, now).allowed).toBe(true);
    expect(rateLimit('b', 1, 1000, now).allowed).toBe(true);
    expect(rateLimit('a', 1, 1000, now).allowed).toBe(false);
  });
});
