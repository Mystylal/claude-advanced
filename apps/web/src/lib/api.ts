const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface AuthResult {
  accessToken: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  participants: string[];
  ownerId: string;
  createdAt: string;
}

export interface MeetingFile {
  id: string;
  meetingId: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  status: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface NestErrorBody {
  message?: string | string[];
}

async function parseError(response: Response): Promise<ApiError> {
  const body = (await response
    .json()
    .catch(() => null)) as NestErrorBody | null;
  const message = Array.isArray(body?.message)
    ? body.message.join(', ')
    : (body?.message ?? 'Something went wrong. Please try again.');
  return new ApiError(message, response.status);
}

export async function registerUser(
  email: string,
  password: string,
): Promise<AuthResult> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return (await response.json()) as AuthResult;
}

export async function getMeetings(token: string): Promise<Meeting[]> {
  const response = await fetch(`${API_URL}/meetings`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return (await response.json()) as Meeting[];
}

export async function getMeeting(token: string, id: string): Promise<Meeting> {
  const response = await fetch(`${API_URL}/meetings/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return (await response.json()) as Meeting;
}

export async function listMeetingFiles(
  token: string,
  meetingId: string,
): Promise<MeetingFile[]> {
  const response = await fetch(`${API_URL}/meetings/${meetingId}/files`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return (await response.json()) as MeetingFile[];
}

function parseErrorBody(responseText: string): string {
  const body = (() => {
    try {
      return JSON.parse(responseText) as NestErrorBody;
    } catch {
      return null;
    }
  })();
  return Array.isArray(body?.message)
    ? body.message.join(', ')
    : (body?.message ?? 'Something went wrong. Please try again.');
}

export function uploadMeetingFile(
  token: string,
  meetingId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<MeetingFile> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/meetings/${meetingId}/files`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as MeetingFile);
      } else {
        reject(new ApiError(parseErrorBody(xhr.responseText), xhr.status));
      }
    };

    xhr.onerror = () => {
      reject(new ApiError('Could not reach the server. Please try again.', 0));
    };

    const formData = new FormData();
    formData.append('file', file);
    xhr.send(formData);
  });
}

export async function downloadMeetingFile(
  token: string,
  meetingId: string,
  file: MeetingFile,
): Promise<void> {
  const response = await fetch(
    `${API_URL}/meetings/${meetingId}/files/${file.id}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!response.ok) {
    throw await parseError(response);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function deleteMeetingFile(
  token: string,
  meetingId: string,
  fileId: string,
): Promise<void> {
  const response = await fetch(
    `${API_URL}/meetings/${meetingId}/files/${fileId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
  );

  if (!response.ok) {
    throw await parseError(response);
  }
}

export async function loginUser(
  email: string,
  password: string,
): Promise<AuthResult> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return (await response.json()) as AuthResult;
}
