'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  ProgressBar,
  Spinner,
} from '@heroui/react';
import {
  ApiError,
  deleteMeetingFile,
  downloadMeetingFile,
  getMeeting,
  listMeetingFiles,
  uploadMeetingFile,
  type Meeting,
  type MeetingFile,
} from '@/lib/api';
import { clearSession, getToken } from '@/lib/auth';

const ACCEPTED_FILE_TYPES =
  'audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function toErrorMessage(err: unknown): string {
  return err instanceof ApiError
    ? err.message
    : 'Could not reach the server. Please try again.';
}

function FileRow({
  file,
  canDelete,
  isDeleting,
  onDownload,
  onDelete,
}: {
  file: MeetingFile;
  canDelete: boolean;
  isDeleting: boolean;
  onDownload: (file: MeetingFile) => void;
  onDelete: (file: MeetingFile) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-foreground/10 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{file.name}</p>
        <p className="text-sm text-foreground/60">
          {file.mimeType} · {formatSize(file.size)} · uploaded{' '}
          {formatDate(file.uploadedAt)} by {file.uploadedBy}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="secondary" onPress={() => onDownload(file)}>
          Download
        </Button>
        {canDelete ? (
          <Button
            variant="secondary"
            isDisabled={isDeleting}
            onPress={() => onDelete(file)}
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function MeetingView() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const meetingId = params.id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [files, setFiles] = useState<MeetingFile[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    Promise.all([
      getMeeting(token, meetingId),
      listMeetingFiles(token, meetingId),
    ])
      .then(([meetingResult, filesResult]) => {
        setMeeting(meetingResult);
        setFiles(filesResult);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          clearSession();
          router.replace('/login');
          return;
        }
        setLoadError(toErrorMessage(err));
      });
  }, [meetingId, router]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    setUploadError(null);
    setUploadProgress(0);

    uploadMeetingFile(token, meetingId, file, setUploadProgress)
      .then((uploaded) => {
        setFiles((prev) => (prev ? [...prev, uploaded] : [uploaded]));
      })
      .catch((err: unknown) => {
        setUploadError(toErrorMessage(err));
      })
      .finally(() => {
        setUploadProgress(null);
      });
  }

  function handleDownload(file: MeetingFile) {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    setActionError(null);
    downloadMeetingFile(token, meetingId, file).catch((err: unknown) => {
      setActionError(toErrorMessage(err));
    });
  }

  function handleDelete(file: MeetingFile) {
    if (!window.confirm(`Delete "${file.name}"? This cannot be undone.`)) {
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    setActionError(null);
    setDeletingId(file.id);
    deleteMeetingFile(token, meetingId, file.id)
      .then(() => {
        setFiles((prev) => prev?.filter((f) => f.id !== file.id) ?? null);
      })
      .catch((err: unknown) => {
        setActionError(toErrorMessage(err));
      })
      .finally(() => {
        setDeletingId(null);
      });
  }

  if (loadError) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-12">
        <Alert status="danger" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{loadError}</Alert.Description>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  if (!meeting || !files) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{meeting.title}</h1>
        <p className="text-sm text-foreground/60">{formatDate(meeting.date)}</p>
      </header>

      <Card>
        <Card.Header>
          <Card.Title>Meeting files</Card.Title>
          <Card.Description>
            Recordings, transcripts, and documents attached to this meeting.
          </Card.Description>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4">
          {uploadError ? (
            <Alert status="danger" role="alert">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{uploadError}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          {actionError ? (
            <Alert status="danger" role="alert">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{actionError}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              onChange={handleFileChange}
              className="hidden"
              disabled={uploadProgress !== null}
            />
            <Button
              variant="secondary"
              isDisabled={uploadProgress !== null}
              onPress={() => fileInputRef.current?.click()}
            >
              {uploadProgress !== null ? 'Uploading…' : 'Upload file'}
            </Button>
            <p className="text-sm text-foreground/60">Max 20 MB.</p>
          </div>

          {uploadProgress !== null ? (
            <ProgressBar value={uploadProgress}>
              <ProgressBar.Output />
              <ProgressBar.Track>
                <ProgressBar.Fill />
              </ProgressBar.Track>
            </ProgressBar>
          ) : null}

          {files.length === 0 ? (
            <EmptyState>
              <p className="text-foreground/60">
                No files attached to this meeting yet.
              </p>
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-2">
              {files.map((file) => (
                <FileRow
                  key={file.id}
                  file={file}
                  canDelete
                  isDeleting={deletingId === file.id}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
