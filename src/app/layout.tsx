import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Conference Media Hub',
  description: 'Temporary media sharing platform for conference photos and videos.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
