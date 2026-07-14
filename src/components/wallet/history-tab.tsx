import type { RecentCheckDto } from '@/server/analysis/dashboard';

export function HistoryTab({ checks }: { checks: RecentCheckDto[] }) {
  if (checks.length === 0) {
    return <p className="text-sm text-muted-foreground">Проверок для этого адреса пока нет.</p>;
  }
  return (
    <div className="overflow-x-auto rounded border border-border">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-border bg-muted text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Дата</th>
            <th className="px-3 py-2">Операций</th>
            <th className="px-3 py-2">Глубина</th>
            <th className="px-3 py-2">Статус</th>
            <th className="px-3 py-2">Источник</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((check) => (
            <tr key={check.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2 text-xs">{new Date(check.createdAt).toLocaleString('ru-RU')}</td>
              <td className="px-3 py-2">{check.limit}</td>
              <td className="px-3 py-2">{check.depth}</td>
              <td className="px-3 py-2">{check.status}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{check.source ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
