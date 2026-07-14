// Read-only links to public block explorers. We link out; we never proxy.

export function tonviewerUrl(address: string): string {
  return `https://tonviewer.com/${encodeURIComponent(address)}`;
}

export function tonscanUrl(address: string): string {
  return `https://tonscan.org/address/${encodeURIComponent(address)}`;
}

export function getgemsNftUrl(nftAddress: string): string {
  return `https://getgems.io/nft/${encodeURIComponent(nftAddress)}`;
}
