import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'TON Wallet Flow Tracker',
  description: 'Визуальный анализ публичной активности TON-кошельков.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
