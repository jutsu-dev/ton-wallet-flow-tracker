// Public Telegram links for the project. These are not secrets: they are shown
// in the UI and printed in the README. A deployment may override them, so every
// component reads them from here instead of hard-coding a URL.

const DEFAULT_CHANNEL_URL = 'https://t.me/tonflowapp';
const DEFAULT_ACCESS_URL = 'https://telegram.me/tonflowapp?direct';

/** Project news channel. */
export const TELEGRAM_CHANNEL_URL = process.env.TELEGRAM_CHANNEL_URL || DEFAULT_CHANNEL_URL;

/** Direct-message link used to request an account by hand. */
export const TELEGRAM_ACCESS_URL = process.env.TELEGRAM_ACCESS_URL || DEFAULT_ACCESS_URL;

/** Spread onto outbound links so the new tab cannot reach back through window.opener. */
export const EXTERNAL_LINK_PROPS = { target: '_blank', rel: 'noopener noreferrer' } as const;

/** Drops the scheme so a link reads as `t.me/...` rather than the full URL. */
export function displayUrl(url: string): string {
  return url.replace('https://', '').replace('http://', '');
}
