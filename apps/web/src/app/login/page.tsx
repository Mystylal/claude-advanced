import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Log in',
  description: 'Log in with your email and password to continue.',
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-white to-zinc-100 px-4 py-12">
      <LoginForm />
    </main>
  );
}
