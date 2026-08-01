import type { Metadata } from 'next';
import { MeetingView } from './meeting-view';

export const metadata: Metadata = {
  title: 'Meeting',
  description: 'Meeting details and files.',
};

export default function MeetingPage() {
  return (
    <main className="min-h-screen bg-linear-to-b from-white to-zinc-100">
      <MeetingView />
    </main>
  );
}
