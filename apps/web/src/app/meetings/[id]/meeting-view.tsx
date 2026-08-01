'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';
import {
  Alert,
  Button,
  Card,
  Chip,
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

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

function UploadCloudIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M12 13v8" />
      <path d="m8 17 4-4 4 4" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function AudioIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="m22 8-6 4 6 4V8Z" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function FileTypeIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('audio/')) {
    return <AudioIcon />;
  }
  if (mimeType.startsWith('video/')) {
    return <VideoIcon />;
  }
  return <DocumentIcon />;
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
    <div className="group flex items-center gap-4 rounded-xl border border-foreground/[0.06] bg-background px-4 py-3.5 transition-colors hover:border-foreground/10 hover:bg-foreground/[0.02]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.04] text-foreground/50">
        <FileTypeIcon mimeType={file.mimeType} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.925rem] font-medium tracking-tight">
          {file.name}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground/50">
          <span>{formatSize(file.size)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatDate(file.uploadedAt)}</span>
          <span aria-hidden="true">·</span>
          <Chip size="sm" className="font-mono text-[0.7rem]">
            {file.uploadedBy}
          </Chip>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          aria-label={`Download ${file.name}`}
          onPress={() => onDownload(file)}
        >
          <DownloadIcon />
        </Button>
        {canDelete ? (
          <Button
            variant="danger-soft"
            size="sm"
            isIconOnly
            isDisabled={isDeleting}
            aria-label={`Delete ${file.name}`}
            onPress={() => onDelete(file)}
          >
            <TrashIcon />
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
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-16">
      <div className="flex flex-col gap-6">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-foreground/50 transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon />
          All meetings
        </Link>

        <header className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold tracking-[0.14em] text-foreground/40 uppercase">
            Meeting
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            {meeting.title}
          </h1>
          <p className="text-sm text-foreground/50">
            {formatDate(meeting.date)}
          </p>
        </header>
      </div>

      <Card className="rounded-3xl border border-foreground/[0.07] px-2 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.12)]">
        <Card.Header className="gap-1 px-6 pt-6 pb-2">
          <p className="text-xs font-semibold tracking-[0.14em] text-foreground/40 uppercase">
            Files
          </p>
          <Card.Title className="text-lg font-semibold tracking-tight">
            Meeting files
          </Card.Title>
          <Card.Description className="text-foreground/50">
            Recordings, transcripts, and documents attached to this meeting.
          </Card.Description>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4 px-6 pb-6">
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

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              onChange={handleFileChange}
              className="hidden"
              disabled={uploadProgress !== null}
            />
            <Button
              variant="outline"
              fullWidth
              isDisabled={uploadProgress !== null}
              onPress={() => fileInputRef.current?.click()}
              className="!h-auto flex-col gap-2 !rounded-2xl border-dashed !py-8 text-foreground/70 hover:text-foreground"
            >
              <UploadCloudIcon />
              <span className="flex flex-col items-center gap-0.5">
                <span className="text-sm font-medium">
                  {uploadProgress !== null
                    ? 'Uploading…'
                    : 'Click to upload a file'}
                </span>
                <span className="text-xs font-normal text-foreground/40">
                  Audio, video, or documents · up to 20 MB
                </span>
              </span>
            </Button>
          </div>

          {uploadProgress !== null ? (
            <ProgressBar value={uploadProgress} className="px-1">
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
