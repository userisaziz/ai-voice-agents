import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Marsa Tijarah — Saudi Arabia\'s Premier B2B Marketplace',
    template: '%s | Marsa Tijarah',
  },
  description: 'AI-powered B2B marketplace connecting suppliers and buyers across Saudi Arabia. Explore industrial equipment, electronics, food products, and more.',
  keywords: ['B2B marketplace', 'Saudi Arabia', 'suppliers', 'buyers', 'industrial equipment', 'wholesale', 'Marsa Tijarah'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
