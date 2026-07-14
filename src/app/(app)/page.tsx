import Link from 'next/link';
import { getCurrentUser } from '@/server/auth/web';
import { getEnv } from '@/lib/env';
import { getDashboardData } from '@/server/analysis/dashboard';
import { AnalyzeForm } from './analyze-form';
import { Badge, Card } from '@/components/ui';
import { LABEL_TYPE_LABELS } from '@/lib/i18n';
import { DEMO_CENTER_ADDRESS } from '@/server/demo/fixtures';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const env = getEnv();
  const { recentChecks, savedWallets } = await getDashboardData(user.id);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="text-lg font-semibold tracking-tight">Анализ TON-адреса</h1>
        <Card>
          <AnalyzeForm demo={env.DEMO_MODE} demoAddress={DEMO_CENTER_ADDRESS} />
        </Card>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Последние проверки
          </h2>
          {recentChecks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Проверок пока нет.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {recentChecks.map((check) => (
                <li key={check.id}>
                  <Link
                    href={`/wallet/${encodeURIComponent(check.address)}?limit=${check.limit}&depth=${check.depth}`}
                    className="flex items-center justify-between gap-2 rounded border border-border px-3 py-2 text-sm hover:bg-muted"
                  >
                    <span className="font-mono">{check.short}</span>
                    <span className="text-xs text-muted-foreground">
                      {check.limit} оп. · {check.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Кошельки с метками
          </h2>
          {savedWallets.length === 0 ? (
            <p className="text-sm text-muted-foreground">Помеченных кошельков пока нет.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {savedWallets.map((wallet) => (
                <li key={wallet.address}>
                  <Link
                    href={`/wallet/${encodeURIComponent(wallet.address)}`}
                    className="flex flex-col gap-1 rounded border border-border px-3 py-2 text-sm hover:bg-muted"
                  >
                    <span className="font-mono">{wallet.short}</span>
                    <span className="flex flex-wrap gap-1">
                      {wallet.labels.map((label, index) => (
                        <Badge key={index}>{LABEL_TYPE_LABELS[label.labelType] ?? label.labelType}</Badge>
                      ))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
