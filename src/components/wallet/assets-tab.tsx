'use client';

import { useEffect, useState } from 'react';
import type { WalletAssets } from '@/server/analysis/assets';
import { Badge, Spinner } from '@/components/ui';
import { shortenAddress } from '@/lib/utils';
import { CopyButton } from '@/components/copy-button';
import { getgemsNftUrl, tonviewerUrl } from '@/lib/explorers';

export function AssetsTab({ address }: { address: string }) {
  const [data, setData] = useState<WalletAssets | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setData(null);
    setError(null);
    fetch(`/api/assets?address=${encodeURIComponent(address)}`)
      .then((res) => (res.ok ? (res.json() as Promise<WalletAssets>) : Promise.reject(new Error('failed'))))
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active) setError('Не удалось загрузить активы.');
      });
    return () => {
      active = false;
    };
  }, [address]);

  if (error) return <p className="text-sm">{error}</p>;
  if (!data) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner /> Загрузка активов…
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">
          Jetton-балансы {data.incomplete ? <Badge>неполные</Badge> : null}
        </h3>
        {data.jettons.length === 0 ? (
          <p className="text-sm text-muted-foreground">Jetton-балансов нет.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.jettons.map((jetton) => (
              <li key={jetton.contractAddress} className="rounded border border-border px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {jetton.balanceFormatted} {jetton.symbol ?? '—'}
                  </span>
                  <CopyButton value={jetton.contractAddress} />
                </div>
                <div className="text-xs text-muted-foreground">
                  Контракт: {shortenAddress(jetton.contractAddress, 6, 4)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">NFT ({data.nftCount})</h3>
        {data.nftItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">NFT не найдены.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.nftItems.map((nft) => (
              <li key={nft.address} className="rounded border border-border px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{nft.name ?? 'NFT'}</span>
                  <a
                    href={getgemsNftUrl(nft.address)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Getgems ↗
                  </a>
                </div>
                <div className="text-xs text-muted-foreground">
                  <a href={tonviewerUrl(nft.address)} target="_blank" rel="noreferrer" className="hover:underline">
                    {shortenAddress(nft.address, 6, 4)}
                  </a>
                  {nft.collectionName ? ` · ${nft.collectionName}` : ''}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
