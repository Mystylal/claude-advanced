import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { MeetingView } from './meeting-view';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Meeting',
  description: 'Meeting details and files.',
};

export default function MeetingPage() {
  return (
    <main
      className={`${inter.variable} min-h-screen bg-linear-to-b from-white to-zinc-50 font-[family-name:var(--font-inter)]`}
    >
      <MeetingView />
    </main>
  );
}
