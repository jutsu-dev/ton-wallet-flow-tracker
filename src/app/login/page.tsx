import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/web';
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
      <p className="text-xs text-muted-foreground">
        Публичная регистрация недоступна. Учётные записи создаёт владелец.
      </p>
    </main>
  );
}
