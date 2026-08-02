'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Chip, EmptyState, Spinner } from '@heroui/react';
import { ApiError, getMeetings, type Meeting } from '@/lib/api';
import { clearSession, getEmail, getToken } from '@/lib/auth';

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  return (
    <Link
      href={`/meetings/${meeting.id}`}
      className="block rounded-2xl transition-opacity hover:opacity-80"
    >
      <Card>
        <Card.Header>
          <Card.Title>{meeting.title}</Card.Title>
          <Card.Description>{formatDate(meeting.date)}</Card.Description>
        </Card.Header>
        <Card.Content>
          <div className="flex flex-wrap gap-2">
            {meeting.participants.map((participant) => (
              <Chip key={participant}>{participant}</Chip>
            ))}
          </div>
        </Card.Content>
      </Card>
    </Link>
  );
}

export function HomeView() {
  const router = useRouter();
  const [email] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : getEmail(),
  );
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    getMeetings(token)
      .then(setMeetings)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          clearSession();
          router.replace('/login');
          return;
        }
        setError(
          err instanceof ApiError
            ? err.message
            : 'Could not reach the server. Please try again.',
        );
      });
  }, [router]);

  function handleLogout() {
    clearSession();
    router.push('/login');
  }

  if (!email) {
    return null;
  }

  const recentMeetings = meetings
    ? [...meetings]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3)
    : [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-12">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Meetings</h1>
          <p className="text-sm text-foreground/60">
            Signed in as{' '}
            <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>
        <Button variant="secondary" onPress={handleLogout}>
          Log out
        </Button>
      </header>

      {error ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {meetings === null && !error ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : null}

      {meetings !== null ? (
        <>
          {recentMeetings.length > 0 ? (
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">Recent meetings</h2>
              <div className="flex flex-col gap-4">
                {recentMeetings.map((meeting) => (
                  <MeetingCard key={meeting.id} meeting={meeting} />
                ))}
              </div>
            </section>
          ) : null}

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">All meetings</h2>
            {meetings.length === 0 ? (
              <EmptyState>
                <p className="text-foreground/60">
                  You don&apos;t have any meetings yet.
                </p>
              </EmptyState>
            ) : (
              <div className="flex flex-col gap-4">
                {meetings.map((meeting) => (
                  <MeetingCard key={meeting.id} meeting={meeting} />
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
