import type { Metadata } from 'next';
import { HomeView } from './home-view';

export const metadata: Metadata = {
  title: 'Meetings',
  description: 'Your meetings, all in one place.',
};

export default function Home() {
  return (
    <main className="min-h-screen bg-linear-to-b from-white to-zinc-100">
      <HomeView />
    </main>
  );
}
