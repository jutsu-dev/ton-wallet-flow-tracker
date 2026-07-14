import { TelegramChannelLink } from './telegram-access';

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground">
        <span>Публичные данные блокчейна TON. Не финансовый и не юридический совет.</span>
        <span>
          Telegram-канал: <TelegramChannelLink />
        </span>
      </div>
    </footer>
  );
}
