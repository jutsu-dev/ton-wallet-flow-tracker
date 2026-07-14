import { cn } from '@/lib/utils';
import {
  EXTERNAL_LINK_PROPS,
  TELEGRAM_ACCESS_URL,
  TELEGRAM_CHANNEL_URL,
  displayUrl,
} from '@/lib/links';

/**
 * Accounts are handed out by hand over Telegram — there is no public
 * registration. Both languages are shown because the request itself happens in
 * Telegram, where either one works. The whole card is the link.
 */
export function TelegramAccess() {
  return (
    <div className="flex flex-col gap-3">
      <a
        {...EXTERNAL_LINK_PROPS}
        href={TELEGRAM_ACCESS_URL}
        className="flex flex-col gap-3 rounded border border-border p-4 transition hover:bg-muted"
      >
        <span className="flex flex-col gap-1">
          <span className="text-sm font-medium">
            🌟 Получить доступ (имя пользователя и пароль)
          </span>
          <span className="text-xs text-muted-foreground">
            Доступ выдаётся вручную через личные сообщения Telegram.
          </span>
        </span>
        <span className="flex flex-col gap-1">
          <span className="text-sm font-medium">🌟 Get access (username &amp; password)</span>
          <span className="text-xs text-muted-foreground">
            Access is issued manually through Telegram direct messages.
          </span>
        </span>
        <span className="break-all font-mono text-xs">{displayUrl(TELEGRAM_ACCESS_URL)}</span>
      </a>
      <p className="text-xs text-muted-foreground">
        Telegram-канал / Telegram channel: <TelegramChannelLink />
      </p>
    </div>
  );
}

/** Bare channel link, also used in the app footer. */
export function TelegramChannelLink({ className }: { className?: string }) {
  return (
    <a
      {...EXTERNAL_LINK_PROPS}
      href={TELEGRAM_CHANNEL_URL}
      className={cn('break-all underline underline-offset-2 hover:text-foreground', className)}
    >
      {displayUrl(TELEGRAM_CHANNEL_URL)}
    </a>
  );
}
