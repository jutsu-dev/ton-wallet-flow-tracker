import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/web';
import { getEnv } from '@/lib/env';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Alert } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.mustChangePassword) redirect('/change-password');
  const demo = getEnv().DEMO_MODE;

  return (
    <div className="flex min-h-screen flex-col">
      <Header username={user.username} role={user.role} demo={demo} />
      {demo ? (
        <div className="mx-auto max-w-5xl px-4 pt-4">
          <Alert tone="warning">
            Демонстрационный режим — используются искусственные данные.
          </Alert>
        </div>
      ) : null}
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</div>
      <Footer />
    </div>
  );
}
