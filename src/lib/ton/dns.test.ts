import { describe, it, expect } from 'vitest';
import { isTonDomain, normalizeTonDomain } from './dns';

describe('isTonDomain', () => {
  it('accepts valid .ton names', () => {
    expect(isTonDomain('foo.ton')).toBe(true);
    expect(isTonDomain('sub.foo.ton')).toBe(true);
    expect(isTonDomain('a.ton')).toBe(true);
    expect(isTonDomain('my-wallet.ton')).toBe(true);
    expect(isTonDomain('FOO.TON')).toBe(true);
  });

  it('rejects non-.ton and malformed names', () => {
    expect(isTonDomain('ton')).toBe(false);
    expect(isTonDomain('foo.com')).toBe(false);
    expect(isTonDomain('foo')).toBe(false);
    expect(isTonDomain('foo..ton')).toBe(false);
    expect(isTonDomain('-bad.ton')).toBe(false);
    expect(isTonDomain('bad-.ton')).toBe(false);
    expect(isTonDomain('')).toBe(false);
    expect(isTonDomain('foo.ton ')).toBe(true); // trimmed
    expect(isTonDomain(null)).toBe(false);
  });
});

describe('normalizeTonDomain', () => {
  it('lowercases valid names and rejects invalid ones', () => {
    expect(normalizeTonDomain('FOO.ton')).toBe('foo.ton');
    expect(normalizeTonDomain('  Bar.Ton ')).toBe('bar.ton');
    expect(normalizeTonDomain('nope.com')).toBeNull();
  });
});
