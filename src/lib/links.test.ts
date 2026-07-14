import { describe, it, expect } from 'vitest';
import {
  EXTERNAL_LINK_PROPS,
  GITHUB_URL,
  SECURITY_POLICY_URL,
  TELEGRAM_ACCESS_URL,
  TELEGRAM_CHANNEL_URL,
  displayUrl,
} from './links';

describe('project links', () => {
  it('points the access link at the direct-message URL', () => {
    expect(TELEGRAM_ACCESS_URL).toBe('https://telegram.me/tonflowapp?direct');
  });

  it('points the channel link at the project channel', () => {
    expect(TELEGRAM_CHANNEL_URL).toBe('https://t.me/tonflowapp');
  });

  it('points at the source repository', () => {
    expect(GITHUB_URL).toBe('https://github.com/jutsu-dev/ton-wallet-flow-tracker');
    expect(SECURITY_POLICY_URL).toBe(
      'https://github.com/jutsu-dev/ton-wallet-flow-tracker/blob/main/SECURITY.md',
    );
  });

  it('isolates opened tabs from the opener', () => {
    expect(EXTERNAL_LINK_PROPS).toEqual({ target: '_blank', rel: 'noopener noreferrer' });
  });

  it('strips the scheme for display', () => {
    expect(displayUrl(TELEGRAM_ACCESS_URL)).toBe('telegram.me/tonflowapp?direct');
    expect(displayUrl(TELEGRAM_CHANNEL_URL)).toBe('t.me/tonflowapp');
    expect(displayUrl(GITHUB_URL)).toBe('github.com/jutsu-dev/ton-wallet-flow-tracker');
  });
});
