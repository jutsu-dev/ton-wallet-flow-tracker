import Link from 'next/link';
import { Badge } from './ui';
import { LogoutButton } from './logout-button';
import { EXTERNAL_LINK_PROPS, GITHUB_URL, TELEGRAM_CHANNEL_URL } from '@/lib/links';

const navLink = 'text-sm text-muted-foreground hover:text-foreground focus-visible:text-foreground';

export function Header({
  username,
  role,
  demo,
}: {
  username: string;
  role: string;
  demo: boolean;
}) {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link href="/" className="font-semibold tracking-tight">
            TON Wallet Flow Tracker
          </Link>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            Граф переводов по публичным данным TON
          </span>
        </div>
        <nav aria-label="Основная навигация" className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link href="/docs" className={navLink}>
            Документация
          </Link>
          {role === 'OWNER' ? (
            <Link href="/admin" className={navLink}>
              Пользователи
            </Link>
          ) : null}
          <a {...EXTERNAL_LINK_PROPS} href={GITHUB_URL} className={navLink}>
            GitHub
          </a>
          <a {...EXTERNAL_LINK_PROPS} href={TELEGRAM_CHANNEL_URL} className={navLink}>
            Telegram
          </a>
          {demo ? <Badge>Демо</Badge> : null}
          <span className="text-sm text-muted-foreground">{username}</span>
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
