'use client';

import { useMemo, useState } from 'react';
import type { WalletAction } from '@/domain/types';
import { shortenAddress } from '@/lib/utils';
import { CopyButton } from '@/components/copy-button';
import { Button, Input, Select } from '@/components/ui';
import { ACTION_TYPE_LABELS, DIRECTION_LABELS } from '@/lib/i18n';
import { tonviewerUrl } from '@/lib/explorers';

const PAGE_SIZE = 25;

function assetLabel(action: WalletAction): string {
  if (action.assetType === 'nft' || action.assetType === 'telegram_gift') {
    return action.nftName ?? 'NFT';
  }
  if (action.assetType === 'jetton') return action.assetSymbol ?? 'Jetton';
  if (action.assetType === 'ton') return 'TON';
  return '—';
}

function amountLabel(action: WalletAction): string {
  if (action.amountFormatted) {
    return `${action.amountFormatted}${action.assetSymbol ? ` ${action.assetSymbol}` : ''}`;
  }
  if (action.assetType === 'nft' || action.assetType === 'telegram_gift') return action.nftName ?? 'NFT';
  return '—';
}

function formatTime(unixSeconds: number): string {
  if (!unixSeconds) return '—';
  return new Date(unixSeconds * 1000).toLocaleString('ru-RU');
}

type SortKey = 'time_desc' | 'time_asc' | 'amount_desc' | 'amount_asc';

export function OperationsTable({ actions }: { actions: WalletAction[] }) {
  const [asset, setAsset] = useState('all');
  const [direction, setDirection] = useState('all');
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState<SortKey>('time_desc');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const fromTs = from ? Date.parse(from) / 1000 : null;
    const toTs = to ? Date.parse(to) / 1000 + 86_400 : null;

    const rows = actions.filter((action) => {
      if (asset !== 'all' && action.assetType !== asset) return false;
      if (direction !== 'all' && action.direction !== direction) return false;
      if (status === 'success' && !action.success) return false;
      if (status === 'failed' && action.success) return false;
      if (fromTs !== null && action.timestamp < fromTs) return false;
      if (toTs !== null && action.timestamp > toTs) return false;
      if (needle) {
        const haystack = [
          action.senderAddress,
          action.recipientAddress,
          action.comment,
          action.memo,
          action.assetSymbol,
          action.nftName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });

    rows.sort((a, b) => {
      if (sort === 'time_asc') return a.timestamp - b.timestamp;
      if (sort === 'time_desc') return b.timestamp - a.timestamp;
      const av = safeBig(a.amountRaw);
      const bv = safeBig(b.amountRaw);
      if (sort === 'amount_asc') return av < bv ? -1 : av > bv ? 1 : 0;
      return av > bv ? -1 : av < bv ? 1 : 0;
    });
    return rows;
  }, [actions, asset, direction, status, query, from, to, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const rows = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  function reset() {
    setPage(0);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-40">
          <Select
            value={asset}
            onChange={(e) => {
              setAsset(e.target.value);
              reset();
            }}
            aria-label="Актив"
          >
            <option value="all">Все активы</option>
            <option value="ton">TON</option>
            <option value="jetton">Jetton</option>
            <option value="nft">NFT</option>
            <option value="telegram_gift">Telegram Gift</option>
          </Select>
        </div>
        <div className="w-36">
          <Select
            value={direction}
            onChange={(e) => {
              setDirection(e.target.value);
              reset();
            }}
            aria-label="Направление"
          >
            <option value="all">Все направления</option>
            <option value="in">Входящие</option>
            <option value="out">Исходящие</option>
          </Select>
        </div>
        <div className="w-36">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              reset();
            }}
            aria-label="Статус"
          >
            <option value="all">Все статусы</option>
            <option value="success">Успешные</option>
            <option value="failed">Неуспешные</option>
          </Select>
        </div>
        <div className="min-w-40 flex-1">
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              reset();
            }}
            placeholder="Поиск: адрес, memo, символ"
            aria-label="Поиск"
          />
        </div>
        <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); reset(); }} className="w-40" aria-label="С даты" />
        <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); reset(); }} className="w-40" aria-label="По дату" />
        <div className="w-40">
          <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Сортировка">
            <option value="time_desc">Время ↓</option>
            <option value="time_asc">Время ↑</option>
            <option value="amount_desc">Сумма ↓</option>
            <option value="amount_asc">Сумма ↑</option>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded border border-border bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
          Операции не найдены.
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-border bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Время</th>
                <th className="px-3 py-2">Тип</th>
                <th className="px-3 py-2">Направление</th>
                <th className="px-3 py-2">Статус</th>
                <th className="px-3 py-2">Актив</th>
                <th className="px-3 py-2">Сумма</th>
                <th className="px-3 py-2">Отправитель</th>
                <th className="px-3 py-2">Получатель</th>
                <th className="px-3 py-2">Memo</th>
                <th className="px-3 py-2">Источник</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((action) => (
                <tr key={action.id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 text-xs">{formatTime(action.timestamp)}</td>
                  <td className="px-3 py-2">{ACTION_TYPE_LABELS[action.actionType] ?? action.actionType}</td>
                  <td className="px-3 py-2">{DIRECTION_LABELS[action.direction] ?? action.direction}</td>
                  <td className="px-3 py-2">
                    <span className={action.success ? '' : 'font-medium underline decoration-dotted'}>
                      {action.success ? 'ОК' : 'Ошибка'}
                    </span>
                  </td>
                  <td className="px-3 py-2">{assetLabel(action)}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono">{amountLabel(action)}</td>
                  <td className="px-3 py-2">{addressCell(action.senderAddress)}</td>
                  <td className="px-3 py-2">{addressCell(action.recipientAddress)}</td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-xs" title={action.comment ?? action.memo ?? ''}>
                    {action.comment ?? action.memo ?? ''}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{action.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Страница {current + 1} из {pageCount} · {filtered.length} операций
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={current === 0} onClick={() => setPage(current - 1)}>
              Назад
            </Button>
            <Button variant="secondary" disabled={current >= pageCount - 1} onClick={() => setPage(current + 1)}>
              Вперёд
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function addressCell(address: string | null) {
  if (!address) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1">
      <a
        href={tonviewerUrl(address)}
        target="_blank"
        rel="noreferrer"
        className="font-mono text-xs hover:underline"
      >
        {shortenAddress(address, 4, 4)}
      </a>
      <CopyButton value={address} />
    </span>
  );
}

function safeBig(value: string | null): bigint {
  if (!value) return 0n;
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}
