import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/web';
import { ChangePasswordForm } from './change-password-form';

export const dynamic = 'force-dynamic';

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Смена пароля</h1>
        <p className="text-sm text-muted-foreground">
          {user.mustChangePassword
            ? 'Задайте постоянный пароль, чтобы продолжить.'
            : 'Обновите пароль для своей учётной записи.'}
        </p>
      </div>
      <ChangePasswordForm />
    </main>
  );
}
