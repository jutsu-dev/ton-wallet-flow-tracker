'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost, ApiError } from '@/lib/client/api';
import { errorMessage } from '@/lib/i18n';
import { Button, Card, Field, Input } from '@/components/ui';

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiPost<{ ok: boolean; mustChangePassword: boolean }>('/api/auth/login', {
        username,
        password,
      });
      router.replace(res.mustChangePassword ? '/change-password' : '/');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? errorMessage(err.code) : errorMessage('error'));
      setLoading(false);
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Имя пользователя" htmlFor="username">
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </Field>
        <Field label="Пароль" htmlFor="password">
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>
        {error ? <p className="text-sm font-medium">{error}</p> : null}
        <Button type="submit" disabled={loading}>
          {loading ? 'Вход…' : 'Войти'}
        </Button>
      </form>
    </Card>
  );
}
