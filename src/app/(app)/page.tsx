import Link from 'next/link';
import { getCurrentUser } from '@/server/auth/web';
import { getEnv } from '@/lib/env';
import { getDashboardData } from '@/server/analysis/dashboard';
import { AnalyzeForm } from './analyze-form';
import { TelegramChannelLink } from '@/components/telegram-access';
import { Badge, Card } from '@/components/ui';
import { LABEL_TYPE_LABELS } from '@/lib/i18n';
import { DEMO_CENTER_ADDRESS } from '@/server/demo/fixtures';
import {
  EXTERNAL_LINK_PROPS,
  GITHUB_URL,
  TELEGRAM_ACCESS_URL,
  displayUrl,
} from '@/lib/links';

export const dynamic = 'force-dynamic';

const COVERS = ['TON', 'Jetton', 'NFT', 'Telegram Gifts', 'Граф переводов', 'Экспорт PNG / SVG'];

const HOW_IT_WORKS = [
  { title: 'Вставьте адрес', body: 'EQ…, UQ…, 0:… или имя .ton. Формат проверяется до запроса.' },
  { title: 'Загрузите операции', body: 'Выберите число операций и глубину обхода — до трёх шагов.' },
  { title: 'Изучите граф', body: 'Раскрывайте контрагентов, читайте суммы и направления на рёбрах.' },
  { title: 'Экспортируйте', body: 'PNG, SVG или квадрат 2048×2048 для отчёта.' },
];

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const env = getEnv();
  const { recentChecks, savedWallets } = await getDashboardData(user.id);

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <div className="flex max-w-2xl flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Схема переводов TON-адреса
          </h1>
          <p className="text-sm text-muted-foreground">
            Введите публичный TON-адрес — приложение загрузит его операции и построит
            интерактивный граф переводов. Seed-фраза, приватный ключ и подключение кошелька
            не требуются.
          </p>
        </div>

        <Card>
          <AnalyzeForm demo={env.DEMO_MODE} demoAddress={DEMO_CENTER_ADDRESS} />
        </Card>

        <ul className="flex flex-wrap gap-1.5">
          {COVERS.map((item) => (
            <li key={item}>
              <Badge>{item}</Badge>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how" className="flex flex-col gap-3">
        <h2 id="how" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Как это работает
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((step, index) => (
            <li key={step.title}>
              <Card className="h-full">
                <p className="text-xs text-muted-foreground tabular-nums">{index + 1}</p>
                <p className="mt-1 text-sm font-medium">{step.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="recent" className="flex flex-col gap-3">
          <h2
            id="recent"
            className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
          >
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

        <section aria-labelledby="labeled" className="flex flex-col gap-3">
          <h2
            id="labeled"
            className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
          >
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
                        <Badge key={index}>
                          {LABEL_TYPE_LABELS[label.labelType] ?? label.labelType}
                        </Badge>
                      ))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="project" className="flex flex-col gap-3">
        <h2
          id="project"
          className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Проект
        </h2>
        <Card>
          <ul className="grid gap-2 text-sm sm:grid-cols-3">
            <li className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Новости проекта</span>
              <TelegramChannelLink />
            </li>
            <li className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Доступ для коллеги</span>
              <a
                {...EXTERNAL_LINK_PROPS}
                href={TELEGRAM_ACCESS_URL}
                className="break-all underline underline-offset-2 hover:text-foreground"
              >
                {displayUrl(TELEGRAM_ACCESS_URL)}
              </a>
            </li>
            <li className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Исходный код</span>
              <a
                {...EXTERNAL_LINK_PROPS}
                href={GITHUB_URL}
                className="break-all underline underline-offset-2 hover:text-foreground"
              >
                {displayUrl(GITHUB_URL)}
              </a>
            </li>
          </ul>
        </Card>
      </section>
    </div>
  );
}
