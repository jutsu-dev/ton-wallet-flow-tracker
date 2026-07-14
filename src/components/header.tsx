import Link from 'next/link';
import { Badge } from './ui';
import { LogoutButton } from './logout-button';

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
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold tracking-tight">
            TON Wallet Flow Tracker
          </Link>
          {role === 'OWNER' ? (
            <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
              Пользователи
            </Link>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {demo ? <Badge>Демо</Badge> : null}
          <span className="text-sm text-muted-foreground">{username}</span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
