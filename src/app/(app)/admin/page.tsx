import { requireOwner } from '@/server/auth/web';
import { listUsers } from '@/server/auth/service';
import { listRecentAudit } from '@/server/audit';
import { UserManager } from '@/components/admin/user-manager';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const owner = await requireOwner();
  const [users, audit] = await Promise.all([listUsers(), listRecentAudit(30)]);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold tracking-tight">Пользователи</h1>
        <UserManager initialUsers={users} currentUserId={owner.id} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Журнал аудита
        </h2>
        {audit.length === 0 ? (
          <p className="text-sm text-muted-foreground">Записей нет.</p>
        ) : (
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-border bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Время</th>
                  <th className="px-3 py-2">Пользователь</th>
                  <th className="px-3 py-2">Действие</th>
                  <th className="px-3 py-2">Ресурс</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((entry) => (
                  <tr key={entry.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-xs">{new Date(entry.createdAt).toLocaleString('ru-RU')}</td>
                    <td className="px-3 py-2">{entry.username ?? '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs">{entry.action}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{entry.resourceType ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
