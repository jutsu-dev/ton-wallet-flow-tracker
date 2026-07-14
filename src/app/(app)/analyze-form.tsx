'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input, Select } from '@/components/ui';
import { ALLOWED_LIMITS } from '@/lib/validation';

export function AnalyzeForm({ demo, demoAddress }: { demo: boolean; demoAddress: string }) {
  const router = useRouter();
  const [address, setAddress] = useState(demo ? demoAddress : '');
  const [limit, setLimit] = useState(25);
  const [depth, setDepth] = useState(1);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const value = address.trim();
    if (!value) return;
    router.push(`/wallet/${encodeURIComponent(value)}?limit=${limit}&depth=${depth}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <Field label="TON-адрес или .ton имя" htmlFor="address">
        <Input
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="EQ… / UQ… / 0:… / name.ton"
          spellCheck={false}
          autoComplete="off"
          className="break-address font-mono"
        />
      </Field>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-28">
          <Field label="Операций" htmlFor="limit">
            <Select id="limit" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
              {ALLOWED_LIMITS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="w-28">
          <Field label="Глубина" htmlFor="depth">
            <Select id="depth" value={depth} onChange={(e) => setDepth(Number(e.target.value))}>
              {[1, 2, 3].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Button type="submit">Построить схему</Button>
      </div>
      {demo ? (
        <p className="text-xs text-muted-foreground">
          В демо-режиме анализируется встроенный пример независимо от введённого адреса.
        </p>
      ) : null}
    </form>
  );
}
