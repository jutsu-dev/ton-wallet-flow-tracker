import Link from 'next/link';
import { TelegramChannelLink } from './telegram-access';
import { EXTERNAL_LINK_PROPS, GITHUB_URL } from '@/lib/links';

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 text-xs text-muted-foreground">
        <span>Публичные данные блокчейна TON. Не финансовый и не юридический совет.</span>
        <nav aria-label="Ссылки проекта" className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link href="/docs" className="underline underline-offset-2 hover:text-foreground">
            Документация
          </Link>
          <a
            {...EXTERNAL_LINK_PROPS}
            href={GITHUB_URL}
            className="underline underline-offset-2 hover:text-foreground"
          >
            GitHub
          </a>
          <span>
            Telegram-канал: <TelegramChannelLink />
          </span>
        </nav>
      </div>
    </footer>
  );
}
