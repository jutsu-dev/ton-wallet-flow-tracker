'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Alert, Badge, Card } from '@/components/ui';
import { CopyButton } from '@/components/copy-button';
import { tonscanUrl, tonviewerUrl } from '@/lib/explorers';
import { LABEL_TYPE_LABELS } from '@/lib/i18n';
import type { AnalysisResult } from '@/server/analysis/types';
import type { RecentCheckDto } from '@/server/analysis/dashboard';
import type { LabelDto } from '@/server/labels/service';
import { OperationsTable } from './operations-table';
import { FlowGraph } from './flow-graph';
import { AssetsTab } from './assets-tab';
import { LabelsTab } from './labels-tab';
import { HistoryTab } from './history-tab';

const TABS = [
  { id: 'diagram', label: 'Диаграмма' },
  { id: 'operations', label: 'Операции' },
  { id: 'assets', label: 'Активы' },
  { id: 'labels', label: 'Метки' },
  { id: 'history', label: 'История проверок' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export function WalletView({
  result,
  history,
  labels,
  currentUser,
  depth,
}: {
  result: AnalysisResult;
  history: RecentCheckDto[];
  labels: LabelDto[];
  currentUser: { id: string; role: string };
  limit: number;
  depth: number;
}) {
  const [tab, setTab] = useState<TabId>('diagram');
  const bounceable = result.address?.bounceable ?? result.input;

  return (
    <div className="flex flex-col gap-4">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← На главную
      </Link>

      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="break-address font-mono text-sm">{bounceable}</span>
            <CopyButton value={bounceable} />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>
              Баланс: <span className="font-medium">{result.account?.balanceTon ?? '—'} TON</span>
            </span>
            <span className="text-muted-foreground">Состояние: {result.account?.state ?? '—'}</span>
            <Badge>Источник: {result.source}</Badge>
            {result.incomplete ? <Badge>Данные неполные</Badge> : null}
            {result.truncated ? <Badge>Схема усечена по лимиту</Badge> : null}
          </div>
          {labels.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {labels.map((label) => (
                <Badge key={label.id}>
                  {LABEL_TYPE_LABELS[label.labelType] ?? label.labelType}: {label.title}
                </Badge>
              ))}
            </div>
          ) : null}
          <div className="flex gap-3 text-xs text-muted-foreground">
            <a href={tonviewerUrl(bounceable)} target="_blank" rel="noreferrer" className="hover:text-foreground">
              TON Viewer
            </a>
            <a href={tonscanUrl(bounceable)} target="_blank" rel="noreferrer" className="hover:text-foreground">
              Tonscan
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            Метки добавлены пользователями и не являются подтверждёнными системой.
          </p>
        </div>
      </Card>

      {result.warnings.length > 0 ? <Alert>{result.warnings.join(' ')}</Alert> : null}

      <nav className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm',
              tab === item.id
                ? 'border-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div>
        {tab === 'diagram' ? <FlowGraph result={result} depth={depth} /> : null}
        {tab === 'operations' ? <OperationsTable actions={result.actions} /> : null}
        {tab === 'assets' ? <AssetsTab address={bounceable} /> : null}
        {tab === 'labels' ? (
          <LabelsTab address={bounceable} initialLabels={labels} currentUser={currentUser} />
        ) : null}
        {tab === 'history' ? <HistoryTab checks={history} /> : null}
      </div>
    </div>
  );
}
