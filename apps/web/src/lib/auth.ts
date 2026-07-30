const TOKEN_KEY = 'accessToken';
const EMAIL_KEY = 'userEmail';

export function saveSession(accessToken: string, email: string): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(EMAIL_KEY, email);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getEmail(): string | null {
  return localStorage.getItem(EMAIL_KEY);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
}
