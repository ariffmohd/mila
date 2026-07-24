import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MILA Conference',
  description: 'Temporary media sharing platform for conference photos and videos.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
