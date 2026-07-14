'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiPost } from '@/lib/client/api';
import { Button } from './ui';

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onLogout() {
    setBusy(true);
    try {
      await apiPost('/api/auth/logout');
    } catch {
      // even if the request fails, send the user to login
    }
    router.replace('/login');
    router.refresh();
  }

  return (
    <Button variant="secondary" onClick={onLogout} disabled={busy} className="px-2 py-1 text-xs">
      Выйти
    </Button>
  );
}
