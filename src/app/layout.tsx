import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Math Fishing — Admin Console',
  description: 'Local-only admin/developer console for the Math Fishing game',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark">
      <body className="min-h-screen bg-ink-900 text-slate-200 antialiased">
        {children}
      </body>
    </html>
  );
}
