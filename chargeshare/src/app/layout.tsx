import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ChargeShare',
  description: 'Community EV charging and slot discovery',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
