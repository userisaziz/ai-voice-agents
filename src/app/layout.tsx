import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'VoiceDesk - AI Voice Receptionist for Any Business',
    template: '%s | VoiceDesk',
  },
  description: 'AI-powered voice receptionist platform for any business. Book appointments, answer questions, and capture leads 24/7.',
  keywords: ['AI receptionist', 'voice AI', 'appointment booking', 'AI voice agent'],
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
