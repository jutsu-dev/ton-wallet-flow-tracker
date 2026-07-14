'use client';

import { useState, type FormEvent } from 'react';
import type { PublicUser } from '@/server/auth/service';
import { apiPatch, apiPost, ApiError } from '@/lib/client/api';
import { errorMessage } from '@/lib/i18n';
import { Badge, Button, Card, Field, Input, Select } from '@/components/ui';

export function UserManager({
  initialUsers,
  currentUserId,
}: {
  initialUsers: PublicUser[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState<PublicUser[]>(initialUsers);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createUser(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await apiPost<{ user: PublicUser }>('/api/admin/users', {
        username: username.trim(),
        password,
        role,
      });
      setUsers([...users, res.user]);
      setUsername('');
      setPassword('');
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'error';
      setError(code === 'username_taken' ? 'Имя пользователя занято.' : errorMessage(code));
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: string, body: { isActive?: boolean; role?: string }) {
    setError(null);
    try {
      await apiPatch(`/api/admin/users/${id}`, body);
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...(body as Partial<PublicUser>) } : u)),
      );
    } catch (err) {
      setError(errorMessage(err instanceof ApiError ? err.code : 'error'));
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <form onSubmit={createUser} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Создать пользователя</h2>
          <Field label="Имя пользователя" htmlFor="new-username">
            <Input
              id="new-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              required
            />
          </Field>
          <Field label="Временный пароль" htmlFor="new-password" hint="Не короче 10 символов. Пользователь сменит его при первом входе.">
            <Input
              id="new-password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
              required
            />
          </Field>
          <Field label="Роль" htmlFor="new-role">
            <Select id="new-role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="MEMBER">MEMBER</option>
              <option value="OWNER">OWNER</option>
            </Select>
          </Field>
          {error ? <p className="text-sm font-medium">{error}</p> : null}
          <Button type="submit" disabled={busy}>
            {busy ? 'Создание…' : 'Создать'}
          </Button>
        </form>
      </Card>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Учётные записи</h2>
        {users.map((user) => (
          <div key={user.id} className="flex flex-col gap-2 rounded border border-border px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{user.username}</span>
              <Badge>{user.role}</Badge>
              {user.isActive ? null : <Badge>отключён</Badge>}
              {user.mustChangePassword ? <Badge>сменит пароль</Badge> : null}
            </div>
            {user.id === currentUserId ? (
              <span className="text-xs text-muted-foreground">Это вы</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  className="px-2 py-1 text-xs"
                  onClick={() => patch(user.id, { isActive: !user.isActive })}
                >
                  {user.isActive ? 'Отключить' : 'Включить'}
                </Button>
                <Button
                  variant="secondary"
                  className="px-2 py-1 text-xs"
                  onClick={() => patch(user.id, { role: user.role === 'OWNER' ? 'MEMBER' : 'OWNER' })}
                >
                  {user.role === 'OWNER' ? 'Сделать MEMBER' : 'Сделать OWNER'}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
