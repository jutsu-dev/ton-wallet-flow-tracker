import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/web';
import { TelegramAccess } from '@/components/telegram-access';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect('/');

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">TON Wallet Flow Tracker</h1>
        <p className="text-sm text-muted-foreground">Вход для участников команды</p>
      </div>
      <LoginForm />
      <TelegramAccess />
      {/* Readable without an account, so you can see what the tool does before
          asking for one. */}
      <p className="text-xs text-muted-foreground">
        <Link href="/docs" className="underline underline-offset-2 hover:text-foreground">
          Документация
        </Link>{' '}
        ·{' '}
        <Link href="/docs?lang=en" className="underline underline-offset-2 hover:text-foreground">
          Documentation
        </Link>{' '}
        — доступна без входа / readable without an account
      </p>
      <p className="text-xs text-muted-foreground">
        Публичная регистрация недоступна. Учётные записи создаёт владелец.
      </p>
      <p className="text-xs text-muted-foreground">
        No public registration — accounts are created by the owner.
      </p>
    </main>
  );
}
