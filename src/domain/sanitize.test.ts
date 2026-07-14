import { describe, it, expect } from 'vitest';
import { sanitizeText, stripMarkup, sanitizeUrl } from './sanitize';

const NUL = String.fromCharCode(0);
const BELL = String.fromCharCode(7);
const DEL = String.fromCharCode(127);

describe('sanitizeText', () => {
  it('drops control characters but keeps printable text', () => {
    expect(sanitizeText(`a${NUL}b${BELL}c${DEL}`)).toBe('abc');
  });

  it('collapses whitespace including tabs and newlines', () => {
    expect(sanitizeText('a\t\n  b')).toBe('a b');
  });

  it('keeps angle brackets (React escapes on render)', () => {
    expect(sanitizeText('<3 you & me')).toBe('<3 you & me');
  });

  it('caps length and appends an ellipsis', () => {
    const out = sanitizeText('x'.repeat(600), 10);
    expect(out).not.toBeNull();
    expect(out?.length).toBe(11);
    expect(out?.endsWith('…')).toBe(true);
  });

  it('returns null for empty or non-string input', () => {
    expect(sanitizeText('')).toBeNull();
    expect(sanitizeText('   ')).toBeNull();
    expect(sanitizeText(null)).toBeNull();
    expect(sanitizeText(123)).toBeNull();
  });
});

describe('stripMarkup', () => {
  it('removes tags and stray angle brackets', () => {
    expect(stripMarkup('<b>hi</b>')).toBe('hi');
    expect(stripMarkup('a<script>alert(1)</script>b')).toBe('aalert(1)b');
    // Everything between the first < and the next > is removed as a tag.
    expect(stripMarkup('safe < unsafe >')).toBe('safe');
    expect(stripMarkup('a > b < c')).toBe('a  b  c');
  });
});

describe('sanitizeUrl', () => {
  it('allows http and https', () => {
    expect(sanitizeUrl('https://example.com/path')).toBe('https://example.com/path');
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com/');
  });

  it('blocks dangerous or non-http schemes', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeUrl('data:text/html,<script>')).toBeNull();
    expect(sanitizeUrl('ftp://example.com')).toBeNull();
    expect(sanitizeUrl('not a url')).toBeNull();
    expect(sanitizeUrl(null)).toBeNull();
  });
});
