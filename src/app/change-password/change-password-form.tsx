'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost, ApiError } from '@/lib/client/api';
import { errorMessage } from '@/lib/i18n';
import { Button, Card, Field, Input } from '@/components/ui';

export function ChangePasswordForm() {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (next.length < 10) {
      setError('Новый пароль должен быть не короче 10 символов.');
      return;
    }
    if (next !== confirm) {
      setError('Пароли не совпадают.');
      return;
    }
    setLoading(true);
    try {
      await apiPost('/api/auth/change-password', { currentPassword: current, newPassword: next });
      router.replace('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? errorMessage(err.code) : errorMessage('error'));
      setLoading(false);
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Текущий пароль" htmlFor="current">
          <Input
            id="current"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>
        <Field label="Новый пароль" htmlFor="next" hint="Не короче 10 символов.">
          <Input
            id="next"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>
        <Field label="Повторите новый пароль" htmlFor="confirm">
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>
        {error ? <p className="text-sm font-medium">{error}</p> : null}
        <Button type="submit" disabled={loading}>
          {loading ? 'Сохранение…' : 'Сменить пароль'}
        </Button>
      </form>
    </Card>
  );
}
