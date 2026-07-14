import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge class names with Tailwind-aware conflict resolution. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Shorten a long address for compact display: EQAbc…wxyz. */
export function shortenAddress(address: string, head = 4, tail = 4): string {
  if (!address) return '';
  if (address.length <= head + tail + 1) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}
