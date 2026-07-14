import { describe, it, expect } from 'vitest';
import {
  EXTERNAL_LINK_PROPS,
  TELEGRAM_ACCESS_URL,
  TELEGRAM_CHANNEL_URL,
  displayUrl,
} from './telegram';

describe('telegram links', () => {
  it('points the access link at the direct-message URL', () => {
    expect(TELEGRAM_ACCESS_URL).toBe('https://telegram.me/tonflowapp?direct');
  });

  it('points the channel link at the project channel', () => {
    expect(TELEGRAM_CHANNEL_URL).toBe('https://t.me/tonflowapp');
  });

  it('isolates opened tabs from the opener', () => {
    expect(EXTERNAL_LINK_PROPS).toEqual({ target: '_blank', rel: 'noopener noreferrer' });
  });

  it('strips the scheme for display', () => {
    expect(displayUrl(TELEGRAM_ACCESS_URL)).toBe('telegram.me/tonflowapp?direct');
    expect(displayUrl(TELEGRAM_CHANNEL_URL)).toBe('t.me/tonflowapp');
  });
});
