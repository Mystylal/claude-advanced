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
