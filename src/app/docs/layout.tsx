import type { ReactNode } from 'react';
import { getCurrentUser } from '@/server/auth/web';
import { getEnv } from '@/lib/env';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export const dynamic = 'force-dynamic';

/**
 * The user guide sits outside the (app) group on purpose: it is readable without
 * an account, so someone deciding whether to request access can see what the
 * tool does first. It still reads the session — when one exists the header shows
 * the signed-in chrome rather than pretending the visitor is a stranger — but it
 * never redirects.
 */
export default async function DocsLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const demo = getEnv().DEMO_MODE;

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={user ? { username: user.username, role: user.role } : null} demo={demo} />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</div>
      <Footer />
    </div>
  );
}
